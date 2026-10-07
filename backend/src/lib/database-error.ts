export class DatabaseOperationError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "DatabaseOperationError";
  }
}

// Map known database codes to safe responses, never database error text.
export function databaseError(error: { code?: string }): DatabaseOperationError {
  if (error.code === "23505") return new DatabaseOperationError("That record already exists.", 409);
  if (["23503", "23514", "23502", "22P02", "22007", "22008"].includes(error.code ?? "")) {
    return new DatabaseOperationError("Invalid record data.", 400);
  }
  return new DatabaseOperationError("Database operation failed. Please try again.");
}
