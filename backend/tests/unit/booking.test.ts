import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../src/lib/enquiry-store.js", () => ({ saveBookingEnquiry: vi.fn(), markEnquiryEmailSent: vi.fn() }));
vi.mock("../../src/lib/email.js", () => ({ sendBookingEnquiryEmail: vi.fn() }));
import { createApp } from "../../src/app.js";
import { saveBookingEnquiry, markEnquiryEmailSent } from "../../src/lib/enquiry-store.js";
import { sendBookingEnquiryEmail } from "../../src/lib/email.js";
import { DatabaseOperationError } from "../../src/lib/database-error.js";
import { bookingInput } from "../fixtures.js";
const app = createApp();
let ipNumber = 0;
function submit(body: object = bookingInput) {
  return request(app).post("/api/booking-enquiry").set("X-Forwarded-For", `192.0.2.${++ipNumber}`).send(body);
}
beforeEach(() => {
  vi.mocked(saveBookingEnquiry).mockResolvedValue({ id: "test-enquiry-id" });
  vi.mocked(sendBookingEnquiryEmail).mockResolvedValue({ sent: true });
  vi.mocked(markEnquiryEmailSent).mockResolvedValue();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe("Booking save and notification behavior", () => {
  it("returns success only after save resolves, then sends and records the email", async () => {
    const response = await submit();
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(saveBookingEnquiry).toHaveBeenCalledWith(bookingInput, expect.objectContaining({ ip: expect.any(String) }));
    expect(markEnquiryEmailSent).toHaveBeenCalledWith("test-enquiry-id");
    expect(vi.mocked(saveBookingEnquiry).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(sendBookingEnquiryEmail).mock.invocationCallOrder[0]);
    expect(vi.mocked(sendBookingEnquiryEmail).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(markEnquiryEmailSent).mock.invocationCallOrder[0]);
  });
  it("returns failure and sends no email if the database write fails", async () => {
    vi.mocked(saveBookingEnquiry).mockRejectedValue(new DatabaseOperationError("Database operation failed."));
    const response = await submit();
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(sendBookingEnquiryEmail).not.toHaveBeenCalled();
    expect(markEnquiryEmailSent).not.toHaveBeenCalled();
  });
  it("does not leak an unexpected database error", async () => {
    vi.mocked(saveBookingEnquiry).mockRejectedValue(new Error("postgres credential details"));
    const response = await submit();
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("postgres credential details");
  });
  it("keeps a saved enquiry successful if email is unavailable", async () => {
    vi.mocked(sendBookingEnquiryEmail).mockResolvedValue({ sent: false, reason: "not_configured" });
    expect((await submit()).body.success).toBe(true);
    expect(markEnquiryEmailSent).not.toHaveBeenCalled();
  });
  it("keeps a saved enquiry successful if the email provider throws", async () => {
    vi.mocked(sendBookingEnquiryEmail).mockRejectedValue(new Error("email unavailable"));
    expect((await submit()).body.success).toBe(true);
    expect(markEnquiryEmailSent).not.toHaveBeenCalled();
  });
  it("does not ask the client to resubmit if only the email status update fails", async () => {
    vi.mocked(markEnquiryEmailSent).mockRejectedValue(new Error("status update failed"));
    expect((await submit()).body.success).toBe(true);
    expect(saveBookingEnquiry).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...bookingInput, role: "admin" },
    { ...bookingInput, arrivalDate: "2030-02-30" },
    { ...bookingInput, arrivalTime: "25:00" },
    { ...bookingInput, email: "invalid" },
  ])("rejects invalid input before any write or email", async (body) => {
    const response = await submit(body);
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(saveBookingEnquiry).not.toHaveBeenCalled();
    expect(sendBookingEnquiryEmail).not.toHaveBeenCalled();
  });
});
