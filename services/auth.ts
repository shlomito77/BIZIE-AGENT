const AUTH_KEY = "bizie_auth_header";
const PROFILE_KEY = "bizie_auth_profile";

export type AuthProfile = {
  type: "basic" | "google";
  label: string;
  email?: string;
  username?: string;
};

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

export function setAuthProfile(profile: AuthProfile) {
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getAuthProfile(): AuthProfile | null {
  const raw = sessionStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthProfile;
  } catch {
    return null;
  }
}

export function getAuthHeader(): string | null {
  return sessionStorage.getItem(AUTH_KEY);
}

export function hasAuth(): boolean {
  return !!sessionStorage.getItem(AUTH_KEY);
}

export function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(PROFILE_KEY);
}
