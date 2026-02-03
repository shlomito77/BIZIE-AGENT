import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireAuth } from "./_auth";
import { ensureSchema } from "./_store";
import { captureError } from "./_monitoring";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!(await requireAuth(req, res))) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    await ensureSchema();
    res.status(200).json({ ok: true });
  } catch (err: any) {
    captureError(err, { route: "health" });
    res.status(500).json({ error: "Health check failed" });
  }
}
