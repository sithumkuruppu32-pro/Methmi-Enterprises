import { asyncRoute } from "../lib/http.js";
import type { NextFunction, Request, Response } from "express";
import { ADMIN_SESSION_COOKIE, isAuthorizedAdminSession } from "../lib/admin-auth.js";

// The frontend middleware also checks the session so /admin redirects
// nicely, but this is the check that actually protects the data.
export const requireAdmin = asyncRoute(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];

  if (await isAuthorizedAdminSession(token)) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized. Please log in again." });
});
