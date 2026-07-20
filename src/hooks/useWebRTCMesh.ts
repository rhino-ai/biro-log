import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';

const supabase = _supabase as any;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

export type RemotePeer = {
  peerId: string;
  userId: string;
  name: string;
  stream: MediaStream | null;
};

type Options = {
  roomKey: string | null;
  selfUserId: string | null;
  selfName: string;
  localStream: MediaStream | null;
  enabled: boolean;
};

/**
 * WebRTC mesh over Supabase realtime broadcast.
 * Each peer keeps an RTCPeerConnection with every other peer.
 * Lower peerId acts as the offerer to avoid glare.
 */
export function useWebRTCMesh({ roomKey, selfUserId, selfName, localStream, enabled }: Options) {
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const peerIdRef = useRef<string>('');
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // keep latest local stream in a ref so callbacks can attach tracks on demand
  useEffect(() => {
    localStreamRef.current = localStream;
    // Replace / add tracks on existing connections
    Object.values(pcsRef.current).forEach((pc) => {
      const senders = pc.getSenders();
      const kinds = new Set(senders.map((s) => s.track?.kind));
      localStream?.getTracks().forEach((track) => {
        const existing = senders.find((s) => s.track?.kind === track.kind);
        if (existing) {
          existing.replaceTrack(track).catch(() => {});
        } else if (!kinds.has(track.kind)) {
          try { pc.addTrack(track, localStream); } catch {}
        }
      });
    });
  }, [localStream]);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = pcsRef.current[peerId];
    if (pc) {
      try { pc.close(); } catch {}
      delete pcsRef.current[peerId];
    }
    setPeers((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((peerId: string, userId: string, name: string) => {
    if (pcsRef.current[peerId]) return pcsRef.current[peerId];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current[peerId] = pc;

    // Attach local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      try { pc.addTrack(track, localStreamRef.current!); } catch {}
    });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setPeers((prev) => ({
        ...prev,
        [peerId]: { peerId, userId, name, stream: remoteStream || prev[peerId]?.stream || null },
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice',
          payload: { from: peerIdRef.current, to: peerId, candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(peerId);
      }
    };

    setPeers((prev) => ({
      ...prev,
      [peerId]: prev[peerId] || { peerId, userId, name, stream: null },
    }));

    return pc;
  }, [cleanupPeer]);

  const makeOffer = useCallback(async (peerId: string, userId: string, name: string) => {
    const pc = createPeerConnection(peerId, userId, name);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'offer',
        payload: { from: peerIdRef.current, fromUserId: selfUserId, fromName: selfName, to: peerId, sdp: offer },
      });
    } catch (err) {
      console.error('offer failed', err);
    }
  }, [createPeerConnection, selfUserId, selfName]);

  useEffect(() => {
    if (!enabled || !roomKey || !selfUserId) return;

    // fresh peerId per session
    peerIdRef.current = `${selfUserId}-${Math.random().toString(36).slice(2, 8)}`;
    const myPeerId = peerIdRef.current;

    const channel = supabase.channel(`webrtc-${roomKey}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'hello' }, ({ payload }: any) => {
      if (!payload || payload.from === myPeerId) return;
      // respond so newcomer sees us
      channel.send({
        type: 'broadcast',
        event: 'hello-ack',
        payload: { from: myPeerId, userId: selfUserId, name: selfName, to: payload.from },
      });
      // Deterministic offerer: lower peerId initiates
      if (myPeerId < payload.from) {
        void makeOffer(payload.from, payload.userId, payload.name);
      }
    });

    channel.on('broadcast', { event: 'hello-ack' }, ({ payload }: any) => {
      if (!payload || payload.to !== myPeerId) return;
      if (myPeerId < payload.from) {
        void makeOffer(payload.from, payload.userId, payload.name);
      }
    });

    channel.on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
      if (!payload || payload.to !== myPeerId) return;
      const pc = createPeerConnection(payload.from, payload.fromUserId, payload.fromName);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { from: myPeerId, to: payload.from, sdp: answer },
        });
      } catch (err) {
        console.error('answer failed', err);
      }
    });

    channel.on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
      if (!payload || payload.to !== myPeerId) return;
      const pc = pcsRef.current[payload.from];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } catch (err) {
        console.error('setRemote answer failed', err);
      }
    });

    channel.on('broadcast', { event: 'ice' }, async ({ payload }: any) => {
      if (!payload || payload.to !== myPeerId) return;
      const pc = pcsRef.current[payload.from];
      if (!pc || !payload.candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.error('addIce failed', err);
      }
    });

    channel.on('broadcast', { event: 'bye' }, ({ payload }: any) => {
      if (!payload) return;
      cleanupPeer(payload.from);
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'hello',
          payload: { from: myPeerId, userId: selfUserId, name: selfName },
        });
      }
    });

    return () => {
      try {
        channel.send({ type: 'broadcast', event: 'bye', payload: { from: myPeerId } });
      } catch {}
      Object.keys(pcsRef.current).forEach((pid) => cleanupPeer(pid));
      supabase.removeChannel(channel);
      channelRef.current = null;
      setPeers({});
    };
  }, [enabled, roomKey, selfUserId, selfName, cleanupPeer, createPeerConnection, makeOffer]);

  return { peers: Object.values(peers) };
}