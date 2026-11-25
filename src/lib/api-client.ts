/**
 * Browser-side JSON client for our own API routes. Cookies are sent
 * automatically (same origin); no tokens are ever stored in JS.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? "Cillad ayaa dhacday.", err.details);
  }
  return data as T;
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message;
  return "Cillad ayaa dhacday. Fadlan hubi internetkaaga oo mar kale isku day.";
}
