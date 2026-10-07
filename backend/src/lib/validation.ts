import { z } from "zod";

const shortText = z.string().trim().max(200);
const optionalText = shortText.optional();
const description = z.string().trim().max(5000).optional();
const slug = z.string().trim().max(80).optional();
const image = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  if (/^\/(?:images|api\/uploads)\/[a-zA-Z0-9_./%-]+$/.test(value) && !value.includes("..")) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "Use an HTTP(S) image URL or a local image path.").optional();

const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");

export const bookingEnquirySchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  whatsappNumber: z.string().trim().min(7).max(20).regex(/^\+?[0-9 ()-]+$/, "Enter a valid phone number."),
  country: shortText.min(2),
  flightNumber: z.string().trim().max(20).optional(),
  arrivalDate: validDate,
  arrivalTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use a valid 24-hour time."),
  pickupLocation: shortText.min(2),
  dropLocation: shortText.min(2),
  vehicleType: shortText.min(1),
  message: z.string().trim().max(1000).optional(),
}).strict();
export type BookingEnquiryInput = z.infer<typeof bookingEnquirySchema>;

export const VEHICLE_CATEGORIES = ["Van", "Car", "SUV", "Bus"] as const;
const requiredName = (label: string) => shortText.min(1, `${label} name is required.`);

// Both the existing newline textarea and a JSON string array are supported.
const stringList = z.union([z.string().max(10000), z.array(z.string().trim().max(500)).max(50)])
  .transform((value) => (typeof value === "string" ? value.split("\n") : value).map((line) => line.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(500)).max(50)).default([]);

export const tourInputSchema = z.object({
  name: requiredName("Tour"), slug, duration: optionalText, pickupTime: optionalText,
  description, highlights: stringList, included: stringList, startingPrice: optionalText, image,
}).strict();
export type TourInput = z.infer<typeof tourInputSchema>;

export const vehicleInputSchema = z.object({
  name: requiredName("Vehicle"), slug, category: z.enum(VEHICLE_CATEGORIES),
  seats: z.number().int().min(1).max(100), ac: z.boolean(), luggageCapacity: optionalText,
  description, image,
  samplePrices: z.object({ colombo: optionalText, galle: optionalText, sigiriya: optionalText }).strict().default({}),
}).strict();
export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Please enter your password.").max(1024),
}).strict();
export const uploadInputSchema = z.object({
  target: z.enum(["tours", "vehicles", "general"]).default("general"),
  slug: z.string().trim().max(80).optional(),
}).strict();
export const slugParamSchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid record slug.");
export function firstErrorMessage(error: z.ZodError): string { return error.issues[0]?.message ?? "Invalid request body."; }
