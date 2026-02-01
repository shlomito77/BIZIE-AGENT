const AUTH_KEY = "bizie_basic_auth";

export function setAuthCredentials(username: string, password: string) {
  const encoded = btoa(`${username}:${password}`);
  sessionStorage.setItem(AUTH_KEY, encoded);
}

export function getAuthHeader(): string | null {
  const encoded = sessionStorage.getItem(AUTH_KEY);
  if (!encoded) return null;
  return `Basic ${encoded}`;
}

export function hasAuth(): boolean {
  return !!sessionStorage.getItem(AUTH_KEY);
}

export function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY);
}
