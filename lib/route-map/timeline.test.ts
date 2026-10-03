import {
  pointAlongLine,
  resolveRouteStartDate,
  routeTimelineFraction,
} from "@/lib/route-map/timeline";
import { describe, expect, it } from "vitest";

describe("routeTimelineFraction", () => {
  it("returns 0 at start and 1 at target", () => {
    expect(
      routeTimelineFraction("2026-09-28", "2026-12-15", "2026-09-28"),
    ).toBe(0);
    expect(
      routeTimelineFraction("2026-09-28", "2026-12-15", "2026-12-15"),
    ).toBe(1);
  });

  it("clamps before start and after target", () => {
    expect(
      routeTimelineFraction("2026-09-28", "2026-12-15", "2026-08-01"),
    ).toBe(0);
    expect(
      routeTimelineFraction("2026-09-28", "2026-12-15", "2027-01-01"),
    ).toBe(1);
  });

  it("interpolates mid-route", () => {
    const mid = routeTimelineFraction(
      "2026-09-28",
      "2026-11-27",
      "2026-10-28",
    );
    expect(mid).toBeGreaterThan(0.45);
    expect(mid).toBeLessThan(0.55);
  });
});

describe("pointAlongLine", () => {
  it("lerps between endpoints", () => {
    expect(pointAlongLine(0, 0, 100, 50, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlongLine(0, 0, 100, 50, 1)).toEqual({ x: 100, y: 50 });
    expect(pointAlongLine(0, 0, 100, 50, 0.5)).toEqual({ x: 50, y: 25 });
  });
});

describe("resolveRouteStartDate", () => {
  it("prefers goal startDate then fallback", () => {
    expect(
      resolveRouteStartDate(
        { startDate: "2026-09-28", targetDate: "2026-12-15" },
        "2026-10-01",
      ),
    ).toBe("2026-09-28");
    expect(
      resolveRouteStartDate({ targetDate: "2026-12-15" }, "2026-10-01"),
    ).toBe("2026-10-01");
  });
});
