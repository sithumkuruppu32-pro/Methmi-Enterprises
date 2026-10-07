import { asyncRoute } from "../lib/http.js";
import { Router } from "express";
import { getAllTours, getAllVehicles } from "../lib/content-store.js";

const router = Router();

router.get("/tours", asyncRoute(async (_req, res) => {
  res.json({ tours: await getAllTours() });
}));

router.get("/vehicles", asyncRoute(async (_req, res) => {
  res.json({ vehicles: await getAllVehicles() });
}));

export default router;
