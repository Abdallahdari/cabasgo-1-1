/**
 * Application error type. Messages are Somali because they are shown to users.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (message = "Codsigu ma saxna.", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", message, details),
  unauthorized: (message = "Fadlan gal akoonkaaga.") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Ogolaansho uma lihid ficilkan.") => new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Lama helin.") => new AppError(404, "NOT_FOUND", message),
  conflict: (message = "Xogtan horay ayay u jirtay.") => new AppError(409, "CONFLICT", message),
  gone: (message = "Xiriirkan wuu dhacay ama horay ayaa loo isticmaalay.") =>
    new AppError(410, "GONE", message),
  tooMany: (retryAfterSeconds: number) =>
    new AppError(
      429,
      "RATE_LIMITED",
      "Isku day badan ayaa la sameeyay. Fadlan sug wax yar kadibna isku day.",
      { retryAfterSeconds },
    ),
  unavailable: (message = "Adeeggan hadda lama heli karo.") =>
    new AppError(503, "SERVICE_UNAVAILABLE", message),
};
