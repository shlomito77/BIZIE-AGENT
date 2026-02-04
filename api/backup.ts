import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireAuth } from "./_auth";
import {
  getBusiness,
  listAppointments,
  listCustomers,
  listSocialThreads,
} from "./_store";
import { enforceRateLimit } from "./_ratelimit";
import { captureError } from "./_monitoring";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!(await requireAuth(req, res))) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (
    !(await enforceRateLimit({
      req,
      res,
      key: "backup",
      limit: 5,
      windowMs: 60_000,
    }))
  ) {
    return;
  }

  try {
    const [business, customers, appointments, social] = await Promise.all([
      getBusiness(),
      listCustomers(),
      listAppointments(),
      listSocialThreads(),
    ]);

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      business,
      customers,
      appointments,
      socialThreads: social,
    });
  } catch (err: any) {
    captureError(err, { route: "backup" });
    res.status(500).json({ error: "Failed to generate backup" });
  }
}
