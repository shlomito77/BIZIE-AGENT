import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireBasicAuth } from "./_auth";
import { listCustomers, saveCustomer } from "./_store";
import type { Customer } from "../types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!requireBasicAuth(req, res)) return;

  if (req.method === "GET") {
    const customers = await listCustomers();
    res.status(200).json({ customers });
    return;
  }

  if (req.method === "POST") {
    const body = (req.body || {}) as Partial<Customer>;
    if (!body.name || !body.phone) {
      res.status(400).json({ error: "Invalid customer payload" });
      return;
    }

    const now = new Date();
    const input: Customer = {
      id: body.id || "",
      name: body.name,
      phone: body.phone,
      email: body.email || "",
      birthday: body.birthday,
      joinDate: body.joinDate ? new Date(body.joinDate) : now,
      lastVisit: body.lastVisit ? new Date(body.lastVisit) : now,
      visitsCount: body.visitsCount ?? 0,
      totalSpent: body.totalSpent ?? 0,
      notes: body.notes || "",
      preferences: body.preferences || [],
      source: body.source || "manual",
      marketingConsent: body.marketingConsent ?? false,
    };

    const saved = await saveCustomer(input);
    res.status(200).json({ customer: saved });
    return;
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
