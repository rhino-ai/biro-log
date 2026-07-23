// Ebbinghaus-style spaced repetition scheduler.
export const REVISION_INTERVALS = [1, 3, 7, 14, 30] as const;

export type UrgencyLevel = "red" | "yellow" | "green";

export interface UrgencyResult {
  level: UrgencyLevel;
  label: "OVERDUE" | "DUE NOW" | "ON TRACK";
}

export const getUrgency = (daysSince: number, nextDue: number): UrgencyResult => {
  const overdue = daysSince - nextDue;
  if (overdue >= 3) return { level: "red", label: "OVERDUE" };
  if (overdue >= 0) return { level: "yellow", label: "DUE NOW" };
  return { level: "green", label: "ON TRACK" };
};

export const getNextDue = (daysSince: number): number => {
  const idx = REVISION_INTERVALS.findIndex((iv) => iv > daysSince);
  return idx === -1
    ? REVISION_INTERVALS[REVISION_INTERVALS.length - 1]
    : REVISION_INTERVALS[Math.max(0, idx - 1)];
};

export { default as RevisionSchedulerPage } from "@/pages/RevisionSchedulerPage";