import { describe, expect, it } from "vitest";
import {
  buildEtaCopy,
  buildTripStatusSummary,
  formatProjectionDate,
  formatRerouteEtaChange,
} from "./eta-copy";
import type { ProjectionResult } from "./engine";

const base: ProjectionResult = {
  currentSaved: 100,
  targetAmount: 400,
  targetDate: "2025-12-15",
  etaDate: "2026-01-03",
  daysEarlyOrLate: -19,
  onTrack: false,
  progressPercent: 0.25,
  dailySeries: [],
  avgDailySpendUsed: 10,
};

describe("formatProjectionDate", () => {
  it("formats like Jan 3", () => {
    expect(formatProjectionDate("2026-01-03")).toMatch(/Jan 3/);
  });
});

describe("formatRerouteEtaChange", () => {
  it("matches hackathon reroute example", () => {
    expect(formatRerouteEtaChange("2026-01-03", "2026-01-14")).toBe(
      "Jan 3 → Jan 14 (+11 days)",
    );
  });

  it("returns null when ETA unchanged", () => {
    expect(formatRerouteEtaChange("2026-01-03", "2026-01-03")).toBeNull();
  });
});

describe("buildEtaCopy", () => {
  it("matches late-arrival wording", () => {
    const copy = buildEtaCopy(base);
    expect(copy.willMakeItOnTime).toBe(false);
    expect(copy.detail).toContain("Jan 3");
    expect(copy.detail).toContain("19 days late");
  });

  it("handles on-time arrival", () => {
    const copy = buildEtaCopy({
      ...base,
      etaDate: "2025-12-15",
      daysEarlyOrLate: 0,
      onTrack: true,
    });
    expect(copy.willMakeItOnTime).toBe(true);
    expect(copy.detail).toContain("on time");
  });
});

describe("buildTripStatusSummary", () => {
  it("matches trip status bar example", () => {
    const summary = buildTripStatusSummary({
      ...base,
      currentSaved: 112,
      progressPercent: 0.28,
    });
    expect(summary.etaDateLabel).toMatch(/Jan 3/);
    expect(summary.paceLabel).toBe("19 days late");
    expect(summary.savedCurrent).toBe(112);
    expect(summary.savedTarget).toBe(400);
    expect(summary.progressPercent).toBe(28);
    expect(summary.onTrack).toBe(false);
  });

  it("uses on time when projected arrival meets target", () => {
    const summary = buildTripStatusSummary({
      ...base,
      etaDate: "2025-12-15",
      daysEarlyOrLate: 0,
      onTrack: true,
    });
    expect(summary.paceLabel).toBe("on time");
    expect(summary.onTrack).toBe(true);
  });
});
