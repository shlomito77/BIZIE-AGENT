import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireAuth } from "./_auth";
import { generateAssistantReply } from "./_ai";
import { getBusiness } from "./_store";
import { enforceRateLimit } from "./_ratelimit";
import { captureError } from "./_monitoring";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!(await requireAuth(req, res))) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (
    !(await enforceRateLimit({
      req,
      res,
      key: "gemini",
      limit: 60,
      windowMs: 60_000,
    }))
  ) {
    return;
  }

  const { contents, mode = "standard" } = req.body || {};
  if (!Array.isArray(contents)) {
    res.status(400).json({ error: "Invalid contents format" });
    return;
  }

  try {
    const business = await getBusiness();
    const result = await generateAssistantReply({
      contents,
      business,
      mode,
    });

    res.status(200).json({
      success: true,
      text: result.text,
      actions: result.actions,
    });
  } catch (error: any) {
    captureError(error, { route: "gemini" });
    res.status(500).json({
      error: "Failed to process request",
      message: error?.message || "Unknown error",
    });
  }
}
