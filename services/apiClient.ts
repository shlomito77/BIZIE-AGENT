import { getAuthHeader } from "./auth";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = getAuthHeader();
  const headers = new Headers(options.headers || {});
  if (authHeader) headers.set("Authorization", authHeader);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message || "Request failed";
    throw new Error(message);
  }
  return data as T;
}
