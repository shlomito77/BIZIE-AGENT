import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handleOptions, requireAuth } from "./_auth";
import {
  cancelAppointment,
  createAppointment,
  getBusiness,
  listAppointments,
} from "./_store";
import { captureError } from "./_monitoring";
import type { Appointment } from "../types";

function pickDuration(businessServices: any[], serviceId: string) {
  const svc = (businessServices || []).find((s) => s.id === serviceId);
  return svc?.duration || 60;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!applyCors(req, res)) return;
  if (!(await requireAuth(req, res))) return;

  try {
    if (req.method === "GET") {
      const appointments = await listAppointments();
      res.status(200).json({ appointments });
      return;
    }

    if (req.method === "POST") {
      const body = (req.body || {}) as Partial<Appointment>;
      if (
        !body.customerName ||
        !body.customerPhone ||
        !body.serviceId ||
        !body.startTime
      ) {
        res.status(400).json({ error: "Invalid appointment payload" });
        return;
      }
      const business = await getBusiness();
      const durationMinutes = pickDuration(business.services, body.serviceId);
      const appointment = await createAppointment({
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        serviceId: body.serviceId,
        startTime: body.startTime as any,
        status: (body.status || "confirmed") as Appointment["status"],
        durationMinutes,
      });
      res.status(201).json({ appointment });
      return;
    }

    if (req.method === "PATCH") {
      const body = (req.body || {}) as { id?: string; customerPhone?: string };
      if (!body.id && !body.customerPhone) {
        res.status(400).json({ error: "Missing id or customerPhone" });
        return;
      }
      await cancelAppointment({ id: body.id, customerPhone: body.customerPhone });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ error: "Method Not Allowed" });
  } catch (err: any) {
    captureError(err, { route: "appointments" });
    res.status(500).json({ error: "Server error" });
  }
}
