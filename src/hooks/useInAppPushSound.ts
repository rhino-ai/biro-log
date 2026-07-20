import { useEffect } from "react";

/** Plays a short beep + toast when the SW forwards a push while the app is focused. */
export function useInAppPushSound() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMsg = (evt: MessageEvent) => {
      const data: any = evt.data;
      if (!data || data.type !== "push") return;
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const now = ctx.currentTime;
        const play = (freq: number, start: number, dur = 0.14) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, now + start);
          g.gain.exponentialRampToValueAtTime(0.22, now + start + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
          o.connect(g).connect(ctx.destination);
          o.start(now + start);
          o.stop(now + start + dur + 0.02);
        };
        play(880, 0);
        play(1320, 0.15);
        setTimeout(() => ctx.close().catch(() => {}), 600);
      } catch {}
      if ("vibrate" in navigator) {
        try { navigator.vibrate?.([120, 60, 120]); } catch {}
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);
}