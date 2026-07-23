import { describe, it, expect } from "vitest";
import { REVISION_INTERVALS, getUrgency, getNextDue } from "./index";

describe("spaced-rep scheduler", () => {
  it("exposes Ebbinghaus intervals", () => {
    expect(REVISION_INTERVALS).toEqual([1, 3, 7, 14, 30]);
  });

  it("marks not-yet-due as green/ON TRACK", () => {
    expect(getUrgency(0, 1)).toEqual({ level: "green", label: "ON TRACK" });
    expect(getUrgency(2, 7)).toEqual({ level: "green", label: "ON TRACK" });
  });

  it("marks due-today as yellow/DUE NOW", () => {
    expect(getUrgency(1, 1)).toEqual({ level: "yellow", label: "DUE NOW" });
    expect(getUrgency(9, 7)).toEqual({ level: "yellow", label: "DUE NOW" });
  });

  it("marks 3+ days late as red/OVERDUE", () => {
    expect(getUrgency(4, 1)).toEqual({ level: "red", label: "OVERDUE" });
    expect(getUrgency(20, 7)).toEqual({ level: "red", label: "OVERDUE" });
  });

  it("getNextDue picks the previous interval reached", () => {
    expect(getNextDue(0)).toBe(1);
    expect(getNextDue(2)).toBe(1);
    expect(getNextDue(5)).toBe(3);
    expect(getNextDue(10)).toBe(7);
    expect(getNextDue(100)).toBe(30);
  });
});