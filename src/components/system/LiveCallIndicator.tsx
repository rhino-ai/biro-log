import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { liveCall, type LiveCallState } from "@/lib/liveCall";
import { Radio, PictureInPicture2, LogOut, X } from "lucide-react";
import { toast } from "sonner";

// Floating "You are LIVE" banner shown app-wide while the user is inside a
// Virtual Library room and their camera / mic are being shared. Hidden when
// the user is actually on /virtual-library (the room UI already shows this).
//
// Also provides Picture-in-Picture: pops the local camera into a floating OS
// window so students clearly see that they are still broadcasting after
// switching tabs / apps on desktop.
export function LiveCallIndicator() {
  const state = useSyncExternalStore(liveCall.subscribe, liveCall.get, liveCall.get) as LiveCallState;
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [pipOn, setPipOn] = useState(false);
  const [dismissedTip, setDismissedTip] = useState(false);

  // Attach stream to the hidden video element (needed for PiP + as a visible feedback source).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (state.active && state.stream) {
      // Only set if it changed – reassigning restarts playback.
      if (v.srcObject !== state.stream) {
        v.srcObject = state.stream;
        v.muted = true;
        v.playsInline = true;
        v.play().catch(() => {});
      }
    } else {
      v.srcObject = null;
    }
  }, [state.active, state.stream]);

  // Track PiP state so the button toggles correctly.
  useEffect(() => {
    const onEnter = () => setPipOn(true);
    const onLeave = () => setPipOn(false);
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener("enterpictureinpicture", onEnter);
    v.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      v.removeEventListener("enterpictureinpicture", onEnter);
      v.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [state.active]);

  // When the tab is hidden and the user is still live, show a persistent notification.
  useEffect(() => {
    if (!state.active) return;
    const onVis = () => {
      if (document.hidden) {
        // fire a single-shot heads-up toast (visible when they return)
        toast.warning("You are still LIVE in the study room — camera & mic are being shared.");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [state.active]);

  const onLibraryPage = location.pathname.startsWith("/virtual-library");
  const show = state.active && !onLibraryPage;

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      // @ts-ignore
      if (document.pictureInPictureElement) {
        // @ts-ignore
        await document.exitPictureInPicture();
      } else {
        // @ts-ignore
        await v.requestPictureInPicture?.();
      }
    } catch (err) {
      toast.error("Picture-in-Picture not supported on this device.");
    }
  };

  return (
    <>
      {/* Hidden video kept mounted whenever a call is active — required so PiP + tab‑hide detection keep working. */}
      <video
        ref={videoRef}
        className="fixed pointer-events-none opacity-0 w-1 h-1"
        style={{ left: -9999, top: -9999 }}
      />
      {show && (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-xl border border-red-500/40 bg-black/90 backdrop-blur-md shadow-2xl shadow-red-500/20 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/15 border-b border-red-500/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-200 truncate">
                  LIVE • {state.roomName || state.roomCode || "Study Room"}
                </p>
                <p className="text-[10px] text-red-100/70 truncate flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Your camera & mic are being shared with members
                </p>
              </div>
              <button
                aria-label="Dismiss tip"
                className="text-red-100/60 hover:text-red-100 p-1"
                onClick={() => setDismissedTip(true)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {!dismissedTip && (
              <div className="px-3 py-2 text-[11px] text-white/70 border-b border-white/5">
                You switched tabs but the room call is still running. Everyone in the room can hear and see you until you press <span className="text-red-300 font-semibold">Leave</span>.
              </div>
            )}
            <div className="flex items-center gap-2 p-2">
              <button
                onClick={() => {
                  if (state.onOpenRoom) state.onOpenRoom();
                  else navigate("/virtual-library");
                }}
                className="flex-1 text-xs px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 text-white font-medium"
              >
                Back to room
              </button>
              <button
                onClick={togglePip}
                title={pipOn ? "Exit picture‑in‑picture" : "Picture‑in‑picture"}
                className="text-xs px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 text-white flex items-center gap-1"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{pipOn ? "Exit PiP" : "PiP"}</span>
              </button>
              <button
                onClick={() => state.onLeave?.()}
                className="text-xs px-3 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}