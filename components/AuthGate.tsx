import React, { useEffect, useState } from "react";
import { apiFetch } from "../services/apiClient";
import { clearAuth, hasAuth, setAuthCredentials } from "../services/auth";

interface Props {
  children: React.ReactNode;
}

const AuthGate: React.FC<Props> = ({ children }) => {
  const [status, setStatus] = useState<"checking" | "unauth" | "ok">("checking");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const verify = async () => {
    setStatus("checking");
    try {
      await apiFetch<{ ok: boolean }>("/api/health");
      setError("");
      setStatus("ok");
    } catch (err: any) {
      clearAuth();
      setError("פרטי התחברות שגויים או הרשאה חסרה.");
      setStatus("unauth");
    }
  };

  useEffect(() => {
    if (hasAuth()) {
      verify();
    } else {
      setStatus("unauth");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthCredentials(username, password);
    await verify();
  };

  if (status === "ok") return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-slate-900">כניסה למערכת</h1>
          <p className="text-slate-400 text-sm font-bold mt-1">
            הזן שם משתמש וסיסמה כדי להמשיך.
          </p>
        </div>
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
          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs font-bold p-3 rounded-xl border border-rose-100">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={status === "checking"}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {status === "checking" ? "בודק..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthGate;
