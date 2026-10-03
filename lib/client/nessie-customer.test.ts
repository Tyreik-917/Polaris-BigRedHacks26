import { isValidNessieCustomerId } from "@/lib/client/nessie-customer";
import { describe, expect, it } from "vitest";

describe("isValidNessieCustomerId", () => {
  it("accepts 24-char hex ObjectIds", () => {
    expect(isValidNessieCustomerId("507f1f77bcf86cd799439011")).toBe(true);
  });

  it("accepts UUIDs", () => {
    expect(isValidNessieCustomerId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("rejects ids that could break URL paths", () => {
    expect(isValidNessieCustomerId("../accounts")).toBe(false);
    expect(isValidNessieCustomerId("507f1f77bcf86cd799439011/extra")).toBe(
      false,
    );
  });
});
