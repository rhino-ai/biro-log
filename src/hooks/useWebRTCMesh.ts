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
  connectionState?: RTCPeerConnectionState;
};

type Options = {
  roomKey: string | null;
  selfUserId: string | null;
  selfName: string;
  localStream: MediaStream | null;
  enabled: boolean;
  /** Bandwidth profile — controls outbound video bitrate cap */
  bandwidthMode?: 'auto' | 'low' | 'normal' | 'high';
};

const BITRATE_KBPS: Record<'low' | 'normal' | 'high', number> = {
  low: 150,
  normal: 600,
  high: 1500,
};

const applyMaxBitrate = async (pc: RTCPeerConnection, kbps: number) => {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0].maxBitrate = kbps * 1000;
      await sender.setParameters(params);
    } catch {}
  }
};

/**
 * WebRTC mesh over Supabase realtime broadcast.
 * Each peer keeps an RTCPeerConnection with every other peer.
 * Lower peerId acts as the offerer to avoid glare.
 */
export function useWebRTCMesh({ roomKey, selfUserId, selfName, localStream, enabled, bandwidthMode = 'auto' }: Options) {
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const peerIdRef = useRef<string>('');
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const restartTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const peerMetaRef = useRef<Record<string, { userId: string; name: string }>>({});
  const bwModeRef = useRef<'auto' | 'low' | 'normal' | 'high'>(bandwidthMode);
  const currentBwRef = useRef<'low' | 'normal' | 'high'>(bandwidthMode === 'auto' ? 'normal' : bandwidthMode);

  useEffect(() => { bwModeRef.current = bandwidthMode; }, [bandwidthMode]);

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
      void applyMaxBitrate(pc, BITRATE_KBPS[currentBwRef.current]);
    });
  }, [localStream]);

  // Re-apply bitrate when the manual bandwidthMode prop changes
  useEffect(() => {
    if (bandwidthMode === 'auto') return;
    currentBwRef.current = bandwidthMode;
    Object.values(pcsRef.current).forEach((pc) => void applyMaxBitrate(pc, BITRATE_KBPS[bandwidthMode]));
  }, [bandwidthMode]);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = pcsRef.current[peerId];
    if (pc) {
      try { pc.close(); } catch {}
      delete pcsRef.current[peerId];
    }
    const t = restartTimersRef.current[peerId];
    if (t) { clearTimeout(t); delete restartTimersRef.current[peerId]; }
    delete peerMetaRef.current[peerId];
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
    peerMetaRef.current[peerId] = { userId, name };

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
      setPeers((prev) => {
        if (!prev[peerId]) return prev;
        return { ...prev, [peerId]: { ...prev[peerId], connectionState: pc.connectionState } };
      });
      // Auto-reconnect: on transient drop, attempt ICE restart if we're the offerer
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const isOfferer = peerIdRef.current < peerId;
        if (isOfferer && pc.connectionState !== 'closed') {
          if (!restartTimersRef.current[peerId]) {
            restartTimersRef.current[peerId] = setTimeout(async () => {
              delete restartTimersRef.current[peerId];
              if (pc.signalingState === 'closed') return;
              try {
                const offer = await pc.createOffer({ iceRestart: true } as any);
                await pc.setLocalDescription(offer);
                channelRef.current?.send({
                  type: 'broadcast',
                  event: 'offer',
                  payload: { from: peerIdRef.current, fromUserId: selfUserId, fromName: selfName, to: peerId, sdp: offer, restart: true },
                });
              } catch (err) {
                console.warn('ICE restart failed, closing peer', err);
                cleanupPeer(peerId);
              }
            }, 1500);
          }
        }
      }
      if (pc.connectionState === 'closed') {
        cleanupPeer(peerId);
      }
      if (pc.connectionState === 'connected') {
        // Apply the current bandwidth cap once the connection is up
        void applyMaxBitrate(pc, BITRATE_KBPS[currentBwRef.current]);
      }
    };

    setPeers((prev) => ({
      ...prev,
      [peerId]: prev[peerId] || { peerId, userId, name, stream: null, connectionState: 'new' },
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
      Object.values(restartTimersRef.current).forEach((t) => clearTimeout(t));
      restartTimersRef.current = {};
      supabase.removeChannel(channel);
      channelRef.current = null;
      setPeers({});
    };
  }, [enabled, roomKey, selfUserId, selfName, cleanupPeer, createPeerConnection, makeOffer]);

  // Adaptive bitrate (auto): sample outbound-rtp stats every 5s, step bandwidth up/down.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(async () => {
      if (bwModeRef.current !== 'auto') return;
      const pcs = Object.values(pcsRef.current).filter((pc) => pc.connectionState === 'connected');
      if (pcs.length === 0) return;
      let worstLoss = 0;
      let worstRtt = 0;
      for (const pc of pcs) {
        try {
          const stats = await pc.getStats();
          let sent = 0, lost = 0, rtt = 0;
          stats.forEach((r: any) => {
            if (r.type === 'outbound-rtp' && r.kind === 'video') {
              sent = r.packetsSent || sent;
            }
            if (r.type === 'remote-inbound-rtp' && r.kind === 'video') {
              lost = r.packetsLost || lost;
              rtt = r.roundTripTime || rtt;
            }
          });
          const loss = sent > 0 ? lost / sent : 0;
          if (loss > worstLoss) worstLoss = loss;
          if (rtt > worstRtt) worstRtt = rtt;
        } catch {}
      }
      const prev = currentBwRef.current;
      let next: 'low' | 'normal' | 'high' = prev;
      if (worstLoss > 0.05 || worstRtt > 0.4) next = 'low';
      else if (worstLoss > 0.02 || worstRtt > 0.25) next = prev === 'high' ? 'normal' : prev;
      else if (worstLoss < 0.01 && worstRtt < 0.15) next = prev === 'low' ? 'normal' : 'high';
      if (next !== prev) {
        currentBwRef.current = next;
        for (const pc of pcs) await applyMaxBitrate(pc, BITRATE_KBPS[next]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [enabled]);

  return { peers: Object.values(peers) };
}