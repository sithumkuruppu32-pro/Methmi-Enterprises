import { describe, expect, it } from "vitest";
import { bookingEnquirySchema, tourInputSchema, vehicleInputSchema, uploadInputSchema, loginInputSchema } from "../../src/lib/validation.js";
import { tourInput, vehicleInput, bookingInput } from "../fixtures.js";

describe("Strict server input validation", () => {
  it("accepts the existing frontend tour/vehicle/booking payloads", () => {
    expect(tourInputSchema.parse(tourInput).highlights).toEqual(["Temple", "Beach"]);
    expect(vehicleInputSchema.parse(vehicleInput).seats).toBe(8);
    expect(bookingEnquirySchema.parse(bookingInput).email).toBe(bookingInput.email);
  });
  for (const extra of ["role", "owner", "price"]) {
    it(`rejects an unexpected ${extra} on all data schemas`, () => {
      expect(tourInputSchema.safeParse({ ...tourInput, [extra]: "admin" }).success).toBe(false);
      expect(vehicleInputSchema.safeParse({ ...vehicleInput, [extra]: "admin" }).success).toBe(false);
      expect(bookingEnquirySchema.safeParse({ ...bookingInput, [extra]: "admin" }).success).toBe(false);
    });
  }
  it("rejects unknown nested samplePrices fields", () => {
    expect(vehicleInputSchema.safeParse({ ...vehicleInput, samplePrices: { ...vehicleInput.samplePrices, owner: "other" } }).success).toBe(false);
  });
  it.each([0, -1, 1.5, 101, "8", null, true])("rejects invalid seats %s", (seats) => {
    expect(vehicleInputSchema.safeParse({ ...vehicleInput, seats }).success).toBe(false);
  });
  it.each(["false", 1, null])("rejects a non-boolean AC value %s", (ac) => {
    expect(vehicleInputSchema.safeParse({ ...vehicleInput, ac }).success).toBe(false);
  });
  it("rejects unsupported categories instead of replacing them with Van", () => {
    expect(vehicleInputSchema.safeParse({ ...vehicleInput, category: "Admin" }).success).toBe(false);
  });
  it.each(["2030-02-30", "2030-13-01", "not-a-date", "2030-1-1"])("rejects invalid date %s", (arrivalDate) => {
    expect(bookingEnquirySchema.safeParse({ ...bookingInput, arrivalDate }).success).toBe(false);
  });
  it.each(["24:00", "12:60", "8:30", "tomorrow"])("rejects invalid time %s", (arrivalTime) => {
    expect(bookingEnquirySchema.safeParse({ ...bookingInput, arrivalTime }).success).toBe(false);
  });
  it.each(["javascript:alert(1)", "data:text/html,bad", "/images/../private"])("rejects unsafe image path %s", (image) => {
    expect(tourInputSchema.safeParse({ ...tourInput, image }).success).toBe(false);
  });
  it("rejects invalid lists and overlong fields", () => {
    expect(tourInputSchema.safeParse({ ...tourInput, highlights: [42] }).success).toBe(false);
    expect(tourInputSchema.safeParse({ ...tourInput, name: "x".repeat(201) }).success).toBe(false);
    expect(bookingEnquirySchema.safeParse({ ...bookingInput, message: "x".repeat(1001) }).success).toBe(false);
  });
  it("rejects unexpected login and upload fields", () => {
    expect(loginInputSchema.safeParse({ password: "example", role: "admin" }).success).toBe(false);
    expect(uploadInputSchema.safeParse({ target: "tours", owner: "other" }).success).toBe(false);
    expect(uploadInputSchema.safeParse({ target: "../../private" }).success).toBe(false);
  });
});
