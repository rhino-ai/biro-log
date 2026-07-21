import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { rearmAllLocalReminders } from "./lib/localReminders";

createRoot(document.getElementById("root")!).render(<App />);

// Re-arm any pending local task reminders on app boot.
try { rearmAllLocalReminders(); } catch {}
