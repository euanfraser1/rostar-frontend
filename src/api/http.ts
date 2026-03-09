export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<TResponse, TBody extends Record<string, unknown>>(
  path: string,
  body: TBody
): Promise<{ ok: true; data: TResponse } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const data = (await res.json()) as TResponse;
    return { ok: true, data };
  }

  // Try to get a useful message from backend JSON, else fallback
  let message = `HTTP ${res.status}`;
  try {
    const maybeJson = (await res.json()) as any;
    if (maybeJson?.error) message = String(maybeJson.error);
    else if (maybeJson?.message) message = String(maybeJson.message);
  } catch {
    // ignore
  }

  return { ok: false, status: res.status, message };
}
