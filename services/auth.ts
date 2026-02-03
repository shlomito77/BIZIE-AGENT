const AUTH_KEY = "bizie_auth_header";

function setAuthHeader(value: string) {
  sessionStorage.setItem(AUTH_KEY, value);
}

export function setBasicAuth(username: string, password: string) {
  const encoded = btoa(`${username}:${password}`);
  setAuthHeader(`Basic ${encoded}`);
}

export function setGoogleAuth(idToken: string) {
  setAuthHeader(`Bearer ${idToken}`);
}

export function getAuthHeader(): string | null {
  return sessionStorage.getItem(AUTH_KEY);
}

export function hasAuth(): boolean {
  return !!sessionStorage.getItem(AUTH_KEY);
}

export function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY);
}
