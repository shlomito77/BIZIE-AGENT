import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireTelegramSecret } from "./_auth";
import { generateAssistantReply } from "./_ai";
import { enforceRateLimit } from "./_ratelimit";
import { captureError } from "./_monitoring";
import {
  getBusiness,
  getSocialThreadByExternal,
  saveSocialThread,
} from "./_store";
import type { ChatMessage, SocialMessage } from "../types";

function parseAllowedChatIds(): string[] {
  return (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function toGeminiContents(history: ChatMessage[]) {
  return history.map((h) => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!requireTelegramSecret(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "TELEGRAM_BOT_TOKEN not configured" });
    return;
  }

  const allowlist = parseAllowedChatIds();
  if (allowlist.length === 0) {
    res.status(500).json({ error: "TELEGRAM_ALLOWED_CHAT_IDS not configured" });
    return;
  }

  const update = req.body || {};
  const message = update.message || update.edited_message;
  if (!message?.chat?.id || !message?.text) {
    res.status(200).json({ ok: true });
    return;
  }

  const chatId = String(message.chat.id);
  if (!allowlist.includes(chatId)) {
    await sendTelegramMessage(
      token,
      chatId,
      "מצטערת, אין הרשאה לשוחח עם הבוט הזה."
    );
    res.status(200).json({ ok: true });
    return;
  }

  if (
    !(await enforceRateLimit({
      req,
      res,
      key: `telegram:${chatId}`,
      limit: 30,
      windowMs: 60_000,
    }))
  ) {
    return;
  }

  const senderName =
    [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") ||
    message.from?.username ||
    "Telegram User";

  const userMsg: ChatMessage = {
    role: "user",
    text: message.text,
    timestamp: new Date(),
  };

  const existing =
    (await getSocialThreadByExternal("telegram", chatId)) || null;
  const history = existing?.chatHistory || [];
  const nextHistory = [...history, userMsg];

  const business = await getBusiness();
  let ai;
  try {
    ai = await generateAssistantReply({
      contents: toGeminiContents(nextHistory),
      business,
      mode: "standard",
    });
  } catch (err: any) {
    captureError(err, { route: "telegram" });
    res.status(500).json({ error: "Failed to generate response" });
    return;
  }

  const botMsg: ChatMessage = {
    role: "model",
    text: ai.text,
    timestamp: new Date(),
  };

  const thread = await saveSocialThread({
    id: existing?.id,
    platform: "telegram" as SocialMessage["platform"],
    externalId: chatId,
    senderName,
    type: "dm",
    isProcessed: true,
    chatHistory: [...nextHistory, botMsg],
    lastMessageAt: new Date(),
  });

  await sendTelegramMessage(token, chatId, ai.text);
  res.status(200).json({ ok: true, threadId: thread.id, actions: ai.actions });
}
