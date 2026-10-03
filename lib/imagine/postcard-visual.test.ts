import { describe, expect, it } from "vitest";
import { postcardProgressStyle } from "./postcard-visual";

describe("postcardProgressStyle", () => {
  it("is most blurred at zero progress", () => {
    expect(postcardProgressStyle(0)).toEqual({ blurPx: 12, opacity: 0.45 });
  });

  it("is clearest at full progress", () => {
    expect(postcardProgressStyle(1)).toEqual({ blurPx: 0, opacity: 1 });
  });

  it("clamps out-of-range values", () => {
    expect(postcardProgressStyle(-1).blurPx).toBe(12);
    expect(postcardProgressStyle(2).blurPx).toBe(0);
  });
});
