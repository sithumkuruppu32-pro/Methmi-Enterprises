export const tourInput = {
  name: "Security Test Tour", duration: "One day", pickupTime: "08:00",
  description: "A test tour", highlights: "Temple\nBeach", included: "Transport",
  startingPrice: "USD 50", image: "",
};
export const vehicleInput = {
  name: "Security Test Van", category: "Van" as const, seats: 8, ac: true,
  luggageCapacity: "4 bags", description: "A test vehicle", image: "",
  samplePrices: { colombo: "USD 20", galle: "USD 50", sigiriya: "USD 80" },
};
export const bookingInput = {
  fullName: "Test Guest", email: "ica5-tests@example.invalid", whatsappNumber: "+94771234567",
  country: "Sri Lanka", flightNumber: "UL123", arrivalDate: "2030-05-01", arrivalTime: "08:30",
  pickupLocation: "Airport", dropLocation: "Hotel", vehicleType: "Test Van", message: "Test enquiry",
};
// A valid, tiny PNG used for storage tests; no external image downloads.
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
