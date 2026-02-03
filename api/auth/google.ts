import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, verifyGoogleAuthToken } from "../_auth";
import { enforceRateLimit } from "../_ratelimit";
import { captureError } from "../_monitoring";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (
    !(await enforceRateLimit({
      req,
      res,
      key: "auth-google",
      limit: 20,
      windowMs: 60_000,
    }))
  ) {
    return;
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    res.status(400).json({ error: "Missing idToken" });
    return;
  }

  try {
    const profile = await verifyGoogleAuthToken(idToken);
    res.status(200).json({ ok: true, email: profile.email });
  } catch (err: any) {
    captureError(err, { route: "auth-google" });
    res.status(401).json({ error: err?.message || "Unauthorized" });
  }
}
