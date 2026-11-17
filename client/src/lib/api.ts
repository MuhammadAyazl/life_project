/**
 * Browser-side API client. All calls go to same-origin /api/* (proxied to Express by next.config),
 * so the httpOnly auth cookie is sent automatically and JS never touches the token.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      res.status >= 500 && !data?.message
        ? 'The server is not responding. Is the API running?'
        : (data?.message ?? 'Request failed.');
    throw new ApiError(res.status, msg, data?.details);
  }
  return data as T;
}

/** First error message for a field from an ApiError (for inline form errors). */
export function fieldError(err: unknown, field: string): string | undefined {
  return err instanceof ApiError ? err.details?.[field]?.[0] : undefined;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}
