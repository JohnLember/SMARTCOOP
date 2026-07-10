import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

// Centralized error handler. Translates known error types to JSON responses.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
  }

  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ message: err.message, details: err.details });
  }

  // Prisma unique-constraint violation
  if (err?.code === "P2002") {
    return res.status(409).json({
      message: `A record with this ${err.meta?.target ?? "value"} already exists`,
    });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ message: "Route not found" });
}
