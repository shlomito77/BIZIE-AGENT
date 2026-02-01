import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  getClientIp,
  handleOptions,
  requireBasicAuth,
} from "./_auth";
import { generateAssistantReply } from "./_ai";
import { getBusiness } from "./_store";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 40;
const RATE_WINDOW = 60000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) return false;
  userLimit.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!requireBasicAuth(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: "Rate limit exceeded. Try again later." });
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
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "Failed to process request",
      message: error?.message || "Unknown error",
    });
  }
}
