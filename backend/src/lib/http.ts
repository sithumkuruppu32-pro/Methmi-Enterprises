import type { Request, Response, NextFunction, RequestHandler } from "express";

// Express 4 does not forward rejected async handlers automatically.
export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}
