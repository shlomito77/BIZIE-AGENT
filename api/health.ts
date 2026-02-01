import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireBasicAuth } from "./_auth";
import { ensureSchema } from "./_store";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!requireBasicAuth(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  await ensureSchema();
  res.status(200).json({ ok: true });
}
