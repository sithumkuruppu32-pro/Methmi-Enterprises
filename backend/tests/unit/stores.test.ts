import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../../src/lib/supabase.js", () => ({ getSupabase: () => db, canWriteToSupabase: () => true }));
import { saveBookingEnquiry, markEnquiryEmailSent } from "../../src/lib/enquiry-store.js";
import { getAllTours, getAllVehicles, saveTour, saveVehicle, deleteTourBySlug, deleteVehicleBySlug } from "../../src/lib/content-store.js";
import { databaseError } from "../../src/lib/database-error.js";
import { bookingInput, tourInput, vehicleInput } from "../fixtures.js";
let reply: { data: unknown; error: null | { code: string; message: string } };
let query: Record<string, any>;
beforeEach(() => {
  reply = { data: { id: "confirmed-id" }, error: null };
  query = { then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(reply).then(resolve, reject) };
  for (const method of ["insert", "update", "delete", "select", "eq", "order", "limit", "single", "maybeSingle"]) query[method] = vi.fn(() => query);
  db.from.mockReturnValue(query);
});
describe("Database result and error handling (mocked query responses)", () => {
  it("requires a confirmed database ID for a saved enquiry", async () => {
    expect(await saveBookingEnquiry(bookingInput, { ip: "192.0.2.1" })).toEqual({ id: "confirmed-id" });
    expect(db.from).toHaveBeenCalledWith("booking_enquiries");
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ full_name: bookingInput.fullName, email_sent: false }));
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.single).toHaveBeenCalled();
  });
  it("rejects missing confirmation rather than reporting save success", async () => {
    reply.data = null;
    await expect(saveBookingEnquiry(bookingInput, {})).rejects.toThrow("Could not confirm");
  });
  it("rejects database insert errors", async () => {
    reply.error = { code: "XX000", message: "raw private database message" };
    await expect(saveBookingEnquiry(bookingInput, {})).rejects.toThrow("Database operation failed");
  });
  it("updates only the saved enquiry when recording email delivery", async () => {
    await markEnquiryEmailSent("confirmed-id");
    expect(query.update).toHaveBeenCalledWith({ email_sent: true });
    expect(query.eq).toHaveBeenCalledWith("id", "confirmed-id");
  });
  it("missing update rows produce 404", async () => {
    reply.data = null;
    await expect(saveTour({ ...tourInput, slug: "tour", highlights: [], included: [] }, "missing")).rejects.toMatchObject({ status: 404 });
    await expect(saveVehicle({ ...vehicleInput, slug: "van" }, "missing")).rejects.toMatchObject({ status: 404 });
  });
  it("empty delete results are reported as not found", async () => {
    reply.data = [];
    expect(await deleteTourBySlug("missing")).toBe(false);
    expect(await deleteVehicleBySlug("missing")).toBe(false);
  });
  it("failed reads never return a fallback list", async () => {
    reply.error = { code: "XX000", message: "raw error" };
    await expect(getAllTours()).rejects.toThrow("Database operation failed");
    await expect(getAllVehicles()).rejects.toThrow("Database operation failed");
  });
  it("unique errors map to 409 without raw database details", async () => {
    reply.error = { code: "23505", message: "private duplicate details" };
    await expect(saveVehicle({ ...vehicleInput, slug: "van" }, "van")).rejects.toMatchObject({ status: 409, message: "That record already exists." });
  });
  it.each(["23503", "23514", "23502", "22P02", "22007", "22008"])("maps invalid-data code %s to 400", (code) => {
    expect(databaseError({ code })).toMatchObject({ status: 400, message: "Invalid record data." });
  });
});
