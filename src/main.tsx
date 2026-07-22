import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { rearmAllLocalReminders } from "./lib/localReminders";

createRoot(document.getElementById("root")!).render(<App />);

// Re-arm any pending local task reminders on app boot.
try { rearmAllLocalReminders(); } catch {}

// Keep push + local reminder notifications available in preview/PWA/native webviews.
// The old inline preview guard can unregister SWs; this app-level registration restores it.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => reg.update().catch(() => {}))
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
