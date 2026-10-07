import type { BookingEnquiryInput } from "./validation.js";
import { getSupabase } from "./supabase.js";
import { DatabaseOperationError, databaseError } from "./database-error.js";

export async function saveBookingEnquiry(
  data: BookingEnquiryInput,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<{ id: string }> {
  const { data: inserted, error } = await getSupabase().from("booking_enquiries").insert({
    full_name: data.fullName, email: data.email, whatsapp_number: data.whatsappNumber,
    country: data.country, flight_number: data.flightNumber || null, arrival_date: data.arrivalDate,
    arrival_time: data.arrivalTime, pickup_location: data.pickupLocation, drop_location: data.dropLocation,
    vehicle_type: data.vehicleType, message: data.message || null, email_sent: false,
    source_ip: meta.ip || null, user_agent: meta.userAgent || null,
  }).select("id").single();
  if (error) throw databaseError(error);
  if (!inserted?.id) throw new DatabaseOperationError("Could not confirm that the enquiry was saved.");
  return { id: inserted.id };
}

export async function markEnquiryEmailSent(id: string): Promise<void> {
  const { error } = await getSupabase().from("booking_enquiries").update({ email_sent: true }).eq("id", id);
  if (error) throw databaseError(error);
}
