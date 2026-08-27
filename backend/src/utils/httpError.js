// Lightweight HTTP error used by services/controllers; caught by errorHandler.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (msg = "Not found") => new HttpError(404, msg);
export const badRequest = (msg = "Bad request", details) =>
  new HttpError(400, msg, details);
export const unauthorized = (msg = "Unauthorized") => new HttpError(401, msg);
export const forbidden = (msg = "Forbidden") => new HttpError(403, msg);
export const conflict = (msg = "Conflict", details) => new HttpError(409, msg, details);
// For a broken invariant — a bug in our own code, not bad input from the user.
// Dressing one of these up as a 400 would tell staff to fix their typing.
export const internalError = (msg = "Something went wrong") => new HttpError(500, msg);
