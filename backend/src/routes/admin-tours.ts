import { asyncRoute } from "../lib/http.js";
import { slugParamSchema } from "../lib/validation.js";
import { Router } from "express";
import {
  ContentStoreError,
  deleteTourBySlug,
  getAllTours,
  saveTour,
} from "../lib/content-store.js";
import { slugify, uniqueSlug } from "../lib/slug.js";
import { firstErrorMessage, tourInputSchema } from "../lib/validation.js";
import { requireAdmin } from "../middleware/require-admin.js";
import type { Tour } from "../types/tour.js";

const router = Router();
router.use(requireAdmin);
router.param("slug", (req, res, next, value) => {
  if (!slugParamSchema.safeParse(value).success) {
    res.status(400).json({ error: "Invalid record slug." });
    return;
  }
  next();
});

router.get("/", asyncRoute(async (_req, res) => {
  res.json({ tours: await getAllTours() });
}));

router.post("/", asyncRoute(async (req, res) => {
  const parsed = tourInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstErrorMessage(parsed.error) });
    return;
  }

  const input = parsed.data;
  const existing = await getAllTours();

  const tour: Tour = {
    slug: uniqueSlug(input.name, existing.map((t) => t.slug)),
    name: input.name,
    duration: input.duration ?? "",
    pickupTime: input.pickupTime ?? "",
    description: input.description ?? "",
    highlights: input.highlights,
    included: input.included,
    startingPrice: input.startingPrice ?? "",
    image: input.image ?? "",
  };

  try {
    await saveTour(tour);
  } catch (error) {
    if (error instanceof ContentStoreError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }

  res.status(201).json({ tour });
}));

router.put("/:slug", asyncRoute(async (req, res) => {
  const { slug } = req.params;

  const parsed = tourInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstErrorMessage(parsed.error) });
    return;
  }

  const input = parsed.data;
  const existing = await getAllTours();
  const current = existing.find((t) => t.slug === slug);

  if (!current) {
    res.status(404).json({ error: "Tour not found." });
    return;
  }

  const requestedSlug = input.slug?.trim() ? slugify(input.slug) : slug;
  if (requestedSlug !== slug && existing.some((t) => t.slug === requestedSlug)) {
    res.status(409).json({ error: "That slug is already used by another tour." });
    return;
  }

  const tour: Tour = {
    slug: requestedSlug,
    name: input.name,
    duration: input.duration ?? "",
    pickupTime: input.pickupTime ?? "",
    description: input.description ?? "",
    highlights: input.highlights,
    included: input.included,
    startingPrice: input.startingPrice ?? "",
    image: input.image ?? current.image,
  };

  try {
    await saveTour(tour, slug);
  } catch (error) {
    if (error instanceof ContentStoreError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }

  res.json({ tour });
}));

router.delete("/:slug", asyncRoute(async (req, res) => {
  try {
    const deleted = await deleteTourBySlug(req.params.slug);
    if (!deleted) {
      res.status(404).json({ error: "Tour not found." });
      return;
    }
  } catch (error) {
    if (error instanceof ContentStoreError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }

  res.json({ ok: true });
}));

export default router;
