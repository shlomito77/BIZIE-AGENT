import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireBasicAuth } from "./_auth";
import { generateAssistantReply } from "./_ai";
import {
  getBusiness,
  getSocialThreadById,
  listSocialThreads,
  saveSocialThread,
} from "./_store";
import type { ChatMessage } from "../types";

function toGeminiContents(history: ChatMessage[]) {
  return history.map((h) => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!requireBasicAuth(req, res)) return;

  if (req.method === "GET") {
    const threads = await listSocialThreads();
    res.status(200).json({ threads });
    return;
  }

  if (req.method === "POST") {
    const body = (req.body || {}) as { threadId?: string; message?: string };
    if (!body.threadId || !body.message) {
      res.status(400).json({ error: "Missing threadId or message" });
      return;
    }
    const thread = await getSocialThreadById(body.threadId);
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    const userMsg: ChatMessage = {
      role: "user",
      text: body.message,
      timestamp: new Date(),
    };
    const nextHistory = [...thread.chatHistory, userMsg];
    const business = await getBusiness();

    const ai = await generateAssistantReply({
      contents: toGeminiContents(nextHistory),
      business,
      mode: "standard",
    });

    const botMsg: ChatMessage = {
      role: "model",
      text: ai.text,
      timestamp: new Date(),
    };
    const updated = await saveSocialThread({
      id: thread.id,
      platform: thread.platform,
      externalId: thread.externalId,
      senderName: thread.senderName,
      type: thread.type,
      isProcessed: true,
      chatHistory: [...nextHistory, botMsg],
      lastMessageAt: new Date(),
    });

    res.status(200).json({ thread: updated, actions: ai.actions });
    return;
  }

  if (req.method === "PATCH") {
    const body = (req.body || {}) as {
      threadId?: string;
      isProcessed?: boolean;
    };
    if (!body.threadId || typeof body.isProcessed !== "boolean") {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    const thread = await getSocialThreadById(body.threadId);
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
    const updated = await saveSocialThread({
      id: thread.id,
      platform: thread.platform,
      externalId: thread.externalId,
      senderName: thread.senderName,
      type: thread.type,
      isProcessed: body.isProcessed,
      chatHistory: thread.chatHistory,
      lastMessageAt: new Date(thread.timestamp),
    });
    res.status(200).json({ thread: updated });
    return;
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
