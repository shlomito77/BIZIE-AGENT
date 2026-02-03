import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireAuth } from "./_auth";
import { getBusiness, saveBusiness } from "./_store";
import { captureError } from "./_monitoring";
import type { BusinessInfo } from "../types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!(await requireAuth(req, res))) return;

  try {
    if (req.method === "GET") {
      const business = await getBusiness();
      res.status(200).json({ business });
      return;
    }

    if (req.method === "PUT") {
      const body = (req.body || {}) as BusinessInfo;
      if (!body?.name || !Array.isArray(body?.services)) {
        res.status(400).json({ error: "Invalid business payload" });
        return;
      }
      const saved = await saveBusiness(body);
      res.status(200).json({ business: saved });
      return;
    }

    res.status(405).json({ error: "Method Not Allowed" });
  } catch (err: any) {
    captureError(err, { route: "business" });
    res.status(500).json({ error: "Server error" });
  }
}
