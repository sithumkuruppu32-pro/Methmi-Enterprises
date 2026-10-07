import { randomBytes, createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { getSupabase } from "../../src/lib/supabase.js";
import { tourInput, vehicleInput, bookingInput, png } from "../fixtures.js";

// These are real HTTP-to-Supabase tests: neither routes nor database clients are mocked.
const db = getSupabase();
const app = createApp();
const prefix = `ica5test-${randomBytes(6).toString("hex")}`;
const testEmail = `${prefix}@example.invalid`;
const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
let cookie: string;
let sequence = 0;
let verifiedTestDatabase = false;
let createdBucket = false;
type Resource = "tours" | "vehicles";
const seeds: Partial<Record<Resource, string>> = {};

async function rows(resource: Resource) {
  const result = await db.from(resource).select("*").like("slug", `${prefix}%`).order("id");
  if (result.error) throw new Error(`Could not read test ${resource}.`);
  return result.data;
}
async function seed(resource: Resource) {
  const input = resource === "tours" ? tourInput : vehicleInput;
  const response = await request(app).post(`/api/admin/${resource}`).set("Cookie", cookie)
    .send({ ...input, name: `${prefix}-${resource}-${++sequence}` });
  expect(response.status).toBe(201);
  return response.body[resource === "tours" ? "tour" : "vehicle"].slug as string;
}
function expiredCookie() {
  const expiry = String(Date.now() - 60000);
  const signature = createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(expiry).digest("hex");
  return `methmi_admin_session=${expiry}.${signature}`;
}

beforeAll(async () => {
  // Second safety gate: an explicit marker in the database is required before any write.
  const marker = await db.from("app_meta").select("value").eq("key", "ica5_test_database").maybeSingle();
  if (marker.error || marker.data?.value !== "TEST_ONLY") {
    throw new Error("Refusing database writes: isolated test database marker is missing. Follow TESTING.md to prepare a disposable project.");
  }
  verifiedTestDatabase = true;
  const login = await request(app).post("/api/admin/login").send({ password: process.env.ADMIN_PASSWORD });
  expect(login.status).toBe(200);
  cookie = login.headers["set-cookie"][0].split(";")[0];
  const result = await db.storage.createBucket(bucket, { public: true });
  if (result.error) throw new Error("Could not create the isolated test storage bucket.");
  createdBucket = true;
  seeds.tours = await seed("tours");
  seeds.vehicles = await seed("vehicles");
});

afterAll(async () => {
  if (!verifiedTestDatabase) return;
  // Never clear a table. Only rows bearing this run's unpredictable prefix are removed.
  const errors: string[] = [];
  for (const resource of ["tours", "vehicles"] as const) {
    const result = await db.from(resource).delete().like("slug", `${prefix}%`);
    if (result.error) errors.push(`cleanup ${resource}`);
  }
  const enquiries = await db.from("booking_enquiries").delete().eq("email", testEmail);
  if (enquiries.error) errors.push("cleanup enquiries");
  if (createdBucket) {
    const emptied = await db.storage.emptyBucket(bucket);
    if (emptied.error) errors.push("empty test bucket");
    const removed = await db.storage.deleteBucket(bucket);
    if (removed.error) errors.push("delete test bucket");
  }
  if (errors.length) throw new Error(`Test cleanup incomplete: ${errors.join(", ")}. Remove only rows prefixed ${prefix} and bucket ${bucket}.`);
});

describe("Real database: admin endpoint access and persistence", () => {
  for (const resource of ["tours", "vehicles"] as const) {
    for (const session of ["absent", "forged", "expired"] as const) {
      it(`${resource}: ${session} session gets 401 on GET/POST/PUT/DELETE and leaves rows unchanged`, async () => {
        const before = await rows(resource);
        const input = resource === "tours" ? tourInput : vehicleInput;
        for (const method of ["get", "post", "put", "delete"] as const) {
          const path = `/api/admin/${resource}${method === "put" || method === "delete" ? `/${seeds[resource]}` : ""}`;
          let call = request(app)[method](path);
          if (session !== "absent") call = call.set("Cookie", session === "expired" ? expiredCookie() : "methmi_admin_session=9999999999999.forged");
          const response = await call.send({ ...input, name: `${prefix}-blocked` });
          expect(response.status).toBe(401);
          expect(await rows(resource)).toEqual(before);
        }
      });
    }
    it(`${resource}: rightful admin creates, reads, updates and deletes confirmed database rows`, async () => {
      const slug = await seed(resource);
      const saved = await db.from(resource).select("*").eq("slug", slug).single();
      expect(saved.error).toBeNull();
      expect(saved.data?.slug).toBe(slug);
      const id = saved.data!.id;
      const list = await request(app).get(`/api/admin/${resource}`).set("Cookie", cookie);
      expect(list.status).toBe(200);
      expect(list.body[resource].some((row: { slug: string }) => row.slug === slug)).toBe(true);
      const input = resource === "tours" ? tourInput : vehicleInput;
      const updated = await request(app).put(`/api/admin/${resource}/${slug}`).set("Cookie", cookie)
        .send({ ...input, name: saved.data!.name, description: "Persisted update verified by a fresh query" });
      expect(updated.status).toBe(200);
      const reread = await db.from(resource).select("description").eq("id", id).single();
      expect(reread.error).toBeNull();
      expect(reread.data?.description).toBe("Persisted update verified by a fresh query");
      expect((await request(app).delete(`/api/admin/${resource}/${slug}`).set("Cookie", cookie)).status).toBe(200);
      const removed = await db.from(resource).select("id").eq("id", id).maybeSingle();
      expect(removed.error).toBeNull();
      expect(removed.data).toBeNull();
    });
    it(`${resource}: extra fields are rejected and existing rows stay unchanged`, async () => {
      const before = await rows(resource);
      const input = resource === "tours" ? tourInput : vehicleInput;
      expect((await request(app).post(`/api/admin/${resource}`).set("Cookie", cookie).send({ ...input, name: `${prefix}-invalid`, role: "admin" })).status).toBe(400);
      expect((await request(app).put(`/api/admin/${resource}/${seeds[resource]}`).set("Cookie", cookie).send({ ...input, owner: "another-user" })).status).toBe(400);
      expect(await rows(resource)).toEqual(before);
    });
    it(`${resource}: duplicate slug returns 409 and missing records return 404`, async () => {
      const other = await seed(resource);
      const before = await rows(resource);
      const input = resource === "tours" ? tourInput : vehicleInput;
      const duplicate = await request(app).put(`/api/admin/${resource}/${other}`).set("Cookie", cookie).send({ ...input, slug: seeds[resource] });
      expect(duplicate.status).toBe(409);
      expect(await rows(resource)).toEqual(before);
      expect((await request(app).put(`/api/admin/${resource}/${prefix}-missing`).set("Cookie", cookie).send(input)).status).toBe(404);
      expect((await request(app).delete(`/api/admin/${resource}/${prefix}-missing`).set("Cookie", cookie)).status).toBe(404);
      expect(await rows(resource)).toEqual(before);
    });
  }
  it("upload rejects absent/forged/expired sessions without creating storage objects", async () => {
    const before = await db.storage.from(bucket).list("tours");
    expect(before.error).toBeNull();
    for (const session of [null, "methmi_admin_session=9999999999999.forged", expiredCookie()]) {
      let call = request(app).post("/api/admin/upload");
      if (session) call = call.set("Cookie", session);
      expect((await call.field("target", "tours").attach("file", png, "test.png")).status).toBe(401);
      const after = await db.storage.from(bucket).list("tours");
      expect(after.error).toBeNull();
      expect(after.data).toEqual(before.data);
    }
  });
  it("rightful admin uploads an image whose actual storage bytes can be read back", async () => {
    const response = await request(app).post("/api/admin/upload").set("Cookie", cookie)
      .field("target", "tours").field("slug", prefix).attach("file", png, { filename: "test.png", contentType: "image/png" });
    expect(response.status).toBe(200);
    expect(response.body.storage).toBe("supabase");
    const urlPath = new URL(response.body.path).pathname;
    const marker = `/storage/v1/object/public/${bucket}/`;
    expect(urlPath.startsWith(marker)).toBe(true);
    const object = await db.storage.from(bucket).download(decodeURIComponent(urlPath.slice(marker.length)));
    expect(object.error).toBeNull();
    expect(Buffer.from(await object.data!.arrayBuffer())).toEqual(png);
  });
});

describe("Real database: booking persistence", () => {
  it("reports success only when a fresh database query confirms the saved enquiry", async () => {
    const response = await request(app).post("/api/booking-enquiry").send({ ...bookingInput, email: testEmail });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const stored = await db.from("booking_enquiries").select("id, full_name, email_sent").eq("email", testEmail);
    expect(stored.error).toBeNull();
    expect(stored.data).toHaveLength(1);
    expect(stored.data![0].full_name).toBe(bookingInput.fullName);
    expect(stored.data![0].id).toBeTruthy();
    // Email credentials are deliberately disabled in this test process.
    expect(stored.data![0].email_sent).toBe(false);
  });
  it("rejects invalid booking fields without inserting another row", async () => {
    const before = await db.from("booking_enquiries").select("id").eq("email", testEmail);
    expect(before.error).toBeNull();
    const response = await request(app).post("/api/booking-enquiry").send({ ...bookingInput, email: testEmail, arrivalDate: "2030-02-30", role: "admin" });
    expect(response.status).toBe(400);
    const after = await db.from("booking_enquiries").select("id").eq("email", testEmail);
    expect(after.error).toBeNull();
    expect(after.data).toEqual(before.data);
  });
});
