import { apiFetch } from "./apiClient";
import type { Appointment, BusinessInfo, Customer, SocialMessage } from "../types";

function hydrateAppointment(a: any): Appointment {
  return {
    ...a,
    startTime: new Date(a.startTime),
  };
}

function hydrateCustomer(c: any): Customer {
  return {
    ...c,
    joinDate: new Date(c.joinDate),
    lastVisit: new Date(c.lastVisit),
  };
}

function hydrateSocial(thread: any): SocialMessage {
  return {
    ...thread,
    timestamp: thread.timestamp ? new Date(thread.timestamp) : new Date(),
    chatHistory: (thread.chatHistory || []).map((m: any) => ({
      ...m,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    })),
  };
}

export async function fetchBusiness(): Promise<BusinessInfo> {
  const data = await apiFetch<{ business: BusinessInfo }>("/api/business");
  return data.business;
}

export async function updateBusiness(
  business: BusinessInfo
): Promise<BusinessInfo> {
  const data = await apiFetch<{ business: BusinessInfo }>("/api/business", {
    method: "PUT",
    body: JSON.stringify(business),
  });
  return data.business;
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const data = await apiFetch<{ appointments: Appointment[] }>(
    "/api/appointments"
  );
  return (data.appointments || []).map(hydrateAppointment);
}

export async function createAppointment(
  appointment: Omit<Appointment, "id">
): Promise<Appointment> {
  const data = await apiFetch<{ appointment: Appointment }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(appointment),
  });
  return hydrateAppointment(data.appointment);
}

export async function cancelAppointment(params: {
  id?: string;
  customerPhone?: string;
}): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/appointments", {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function fetchCustomers(): Promise<Customer[]> {
  const data = await apiFetch<{ customers: Customer[] }>("/api/customers");
  return (data.customers || []).map(hydrateCustomer);
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  const data = await apiFetch<{ customer: Customer }>("/api/customers", {
    method: "POST",
    body: JSON.stringify(customer),
  });
  return hydrateCustomer(data.customer);
}

export async function fetchSocialThreads(): Promise<SocialMessage[]> {
  const data = await apiFetch<{ threads: SocialMessage[] }>("/api/social");
  return (data.threads || []).map(hydrateSocial);
}

export async function sendSocialMessage(params: {
  threadId: string;
  message: string;
}): Promise<{ thread: SocialMessage; actions: any[] }> {
  const data = await apiFetch<{ thread: SocialMessage; actions: any[] }>(
    "/api/social",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return { thread: hydrateSocial(data.thread), actions: data.actions || [] };
}

export async function markSocialProcessed(params: {
  threadId: string;
  isProcessed: boolean;
}): Promise<SocialMessage> {
  const data = await apiFetch<{ thread: SocialMessage }>("/api/social", {
    method: "PATCH",
    body: JSON.stringify(params),
  });
  return hydrateSocial(data.thread);
}
