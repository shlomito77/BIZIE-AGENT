import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/apiClient";
import {
  clearAuth,
  getAuthProfile,
  hasAuth,
  setAuthProfile,
  setBasicAuth,
  setGoogleAuth,
} from "../services/auth";

interface Props {
  children: React.ReactNode;
}

const AuthGate: React.FC<Props> = ({ children }) => {
  const [status, setStatus] = useState<"checking" | "unauth" | "ok">("checking");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"basic" | "google">("basic");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const verify = async (profile?: { type: "basic" | "google"; label: string; email?: string; username?: string }) => {
    setStatus("checking");
    try {
      await apiFetch<{ ok: boolean }>("/api/health");
      setError("");
      setStatus("ok");
      if (profile) {
        setAuthProfile(profile);
      }
    } catch (err: any) {
      clearAuth();
      setError("פרטי התחברות שגויים או הרשאה חסרה.");
      setStatus("unauth");
    }
  };

  useEffect(() => {
    if (hasAuth()) {
      verify(getAuthProfile() || undefined);
    } else {
      setStatus("unauth");
    }
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    let attempts = 0;

    const initGoogle = () => {
      if (cancelled) return;
      const google = (window as any).google;
      if (!google?.accounts?.id || !googleButtonRef.current) {
        attempts += 1;
        if (attempts < 10) {
          setTimeout(initGoogle, 400);
        }
        return;
      }

      if (googleButtonRef.current.childNodes.length > 0) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          try {
            const authResult = await apiFetch<{ ok: boolean; email?: string }>("/api/auth/google", {
              method: "POST",
              body: JSON.stringify({ idToken: response.credential }),
            });
            setGoogleAuth(response.credential);
            await verify({
              type: "google",
              label: authResult.email || "Google",
              email: authResult.email,
            });
          } catch (err: any) {
            clearAuth();
            setError(err?.message || "Google Sign-In נכשל.");
            setStatus("unauth");
          }
        },
      });

      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: "320",
      });
    };

    initGoogle();
    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBasicAuth(username, password);
    await verify({
      type: "basic",
      label: username || "Admin",
      username,
    });
  };

  if (status === "ok") return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-slate-900">כניסה למערכת</h1>
          <p className="text-slate-400 text-sm font-bold mt-1">
            בחר/י דרך כניסה כדי להמשיך.
          </p>
        </div>
        {googleClientId && (
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-black">
            <button
              type="button"
              onClick={() => setLoginMode("basic")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                loginMode === "basic"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              סיסמה
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("google")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                loginMode === "google"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Google
            </button>
          </div>
        )}
        {loginMode === "basic" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-slate-400 uppercase">
                שם משתמש
              </label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none text-right"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-slate-400 uppercase">
                סיסמה
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl font-bold outline-none text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={status === "checking"}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {status === "checking" ? "בודק..." : "כניסה"}
            </button>
          </form>
        )}
        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs font-bold p-3 rounded-xl border border-rose-100">
            {error}
          </div>
        )}
        {googleClientId && loginMode === "google" && (
          <>
            <div className="text-center text-slate-400 text-xs font-black">או</div>
            <div className="flex justify-center">
              <div ref={googleButtonRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthGate;
