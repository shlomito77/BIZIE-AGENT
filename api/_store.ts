import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type {
  Appointment,
  BusinessInfo,
  ChatMessage,
  Customer,
  SocialMessage,
} from "../types";

type SettingRow = {
  value: any;
};

type AppointmentRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  start_time: Date;
  status: string;
  google_event_id: string | null;
  duration_minutes: number;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  join_date: Date;
  last_visit: Date;
  visits_count: number;
  total_spent: number;
  notes: string | null;
  preferences: string[] | null;
  source: string;
  marketing_consent: boolean;
};

type SocialThreadRow = {
  id: string;
  platform: string;
  external_id: string | null;
  sender_name: string;
  type: string;
  is_processed: boolean;
  chat_history: ChatMessage[];
  last_message_at: Date;
};

let sqlClient: postgres.Sql | null = null;

function getSql() {
  if (sqlClient) return sqlClient;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("POSTGRES_URL not configured");
  }
  sqlClient = postgres(url, { ssl: "require" });
  return sqlClient;
}

function readJsonFile<T>(relativePath: string): T | null {
  try {
    const p = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readBusinessFallback(): BusinessInfo {
  const parsed = readJsonFile<any>("data/business.json");
  if (!parsed || typeof parsed !== "object") {
    return {
      name: "Bizie",
      ownerName: "Owner",
      category: "services",
      address: "",
      phone: "",
      services: [],
      openingHours: "",
      isCalendarConnected: false,
      aiModel: "gemini-flash-lite-latest",
      policies: "",
      calendarMode: "virtual",
      googleClientId: "",
    };
  }
  const services = (parsed.services || []).map((s: any) => ({
    id: s.id || crypto.randomUUID(),
    name: s.name || "Service",
    description: s.description || "",
    duration: s.duration || 60,
    price: s.price || 0,
  }));
  return {
    name: parsed.name || "Bizie",
    ownerName: parsed.ownerName || "Owner",
    category: parsed.category || "services",
    address: parsed.address || "",
    phone: parsed.phone || "",
    services,
    openingHours: parsed.hours || parsed.openingHours || "",
    isCalendarConnected: false,
    aiModel: "gemini-flash-lite-latest",
    policies: parsed.policies || "",
    calendarMode: parsed.calendarMode || "virtual",
    googleClientId: parsed.googleClientId || "",
  };
}

function normalizeBusiness(business: BusinessInfo): BusinessInfo {
  const services = (business.services || []).map((s) => ({
    id: s.id || crypto.randomUUID(),
    name: s.name,
    description: s.description || "",
    duration: s.duration || 60,
    price: s.price || 0,
  }));
  return {
    ...business,
    services,
    aiModel: business.aiModel || "gemini-flash-lite-latest",
    calendarMode: business.calendarMode || "virtual",
    googleClientId: business.googleClientId || "",
    policies: business.policies || "",
  };
}

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      phone text NOT NULL UNIQUE,
      email text,
      birthday date,
      join_date timestamptz NOT NULL,
      last_visit timestamptz NOT NULL,
      visits_count int NOT NULL DEFAULT 0,
      total_spent numeric NOT NULL DEFAULT 0,
      notes text,
      preferences text[] NOT NULL DEFAULT '{}',
      source text NOT NULL,
      marketing_consent boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id uuid PRIMARY KEY,
      customer_name text NOT NULL,
      customer_phone text NOT NULL,
      service_id text NOT NULL,
      start_time timestamptz NOT NULL,
      status text NOT NULL,
      google_event_id text,
      duration_minutes int NOT NULL DEFAULT 60,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS appointments_start_time_idx
    ON appointments (start_time);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS appointments_customer_phone_idx
    ON appointments (customer_phone);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS social_threads (
      id uuid PRIMARY KEY,
      platform text NOT NULL,
      external_id text,
      sender_name text NOT NULL,
      type text NOT NULL,
      is_processed boolean NOT NULL DEFAULT false,
      chat_history jsonb NOT NULL DEFAULT '[]'::jsonb,
      last_message_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS social_threads_platform_external_idx
    ON social_threads (platform, external_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS social_threads_last_message_idx
    ON social_threads (last_message_at DESC);
  `;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<SettingRow[]>`
    SELECT value
    FROM settings
    WHERE key = ${key}
    LIMIT 1;
  `;
  if (rows.length === 0) return null;
  return rows[0].value as T;
}

export async function saveSetting<T>(key: string, value: T): Promise<T> {
  const sql = getSql();
  await ensureSchema();
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  `;
  return value;
}

export async function getConversationFlow(): Promise<any | null> {
  const existing = await getSetting<any>("conversation_flow");
  if (existing) return existing;
  const fallback = readJsonFile<any>("data/conversation.flow.json");
  if (fallback) {
    await saveSetting("conversation_flow", fallback);
    return fallback;
  }
  return null;
}

export async function getAssistantKnowledge(): Promise<any | null> {
  const existing = await getSetting<any>("assistant_knowledge");
  if (existing) return existing;
  const fallback = readJsonFile<any>("data/business.knowledge.json");
  if (fallback) {
    await saveSetting("assistant_knowledge", fallback);
    return fallback;
  }
  return null;
}

export async function getBusiness(): Promise<BusinessInfo> {
  const existing = await getSetting<BusinessInfo>("business");
  if (!existing) {
    const fallback = normalizeBusiness(readBusinessFallback());
    await saveBusiness(fallback);
    return fallback;
  }
  return normalizeBusiness(existing);
}

export async function saveBusiness(business: BusinessInfo): Promise<BusinessInfo> {
  const sql = getSql();
  await ensureSchema();
  const normalized = normalizeBusiness(business);
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('business', ${JSON.stringify(normalized)}::jsonb, now())
    ON CONFLICT (key)
    DO UPDATE SET value = ${JSON.stringify(normalized)}::jsonb, updated_at = now();
  `;
  return normalized;
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceId: row.service_id,
    startTime: new Date(row.start_time),
    status: row.status as Appointment["status"],
    googleEventId: row.google_event_id || undefined,
  };
}

export async function listAppointments(): Promise<Appointment[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<AppointmentRow[]>`
    SELECT *
    FROM appointments
    ORDER BY start_time DESC;
  `;
  return rows.map(mapAppointment);
}

export async function createAppointment(input: {
  customerName: string;
  customerPhone: string;
  serviceId: string;
  startTime: Date | string;
  status: Appointment["status"];
  durationMinutes: number;
  googleEventId?: string;
}): Promise<Appointment> {
  const sql = getSql();
  await ensureSchema();
  const id = crypto.randomUUID();
  const start = new Date(input.startTime);
  const rows = await sql<AppointmentRow[]>`
    INSERT INTO appointments (
      id,
      customer_name,
      customer_phone,
      service_id,
      start_time,
      status,
      google_event_id,
      duration_minutes
    )
    VALUES (
      ${id},
      ${input.customerName},
      ${input.customerPhone},
      ${input.serviceId},
      ${start.toISOString()}::timestamptz,
      ${input.status},
      ${input.googleEventId || null},
      ${input.durationMinutes}
    )
    RETURNING *;
  `;
  return mapAppointment(rows[0]);
}

export async function cancelAppointment(params: {
  id?: string;
  customerPhone?: string;
}): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  if (params.id) {
    await sql`
      UPDATE appointments
      SET status = 'cancelled', updated_at = now()
      WHERE id = ${params.id};
    `;
    return;
  }
  if (params.customerPhone) {
    await sql`
      UPDATE appointments
      SET status = 'cancelled', updated_at = now()
      WHERE customer_phone = ${params.customerPhone};
    `;
  }
}

export async function checkAvailability(params: {
  startTime: Date | string;
  durationMinutes: number;
}): Promise<boolean> {
  const sql = getSql();
  await ensureSchema();
  const start = new Date(params.startTime);
  const end = new Date(start.getTime() + params.durationMinutes * 60000);
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM appointments
    WHERE status <> 'cancelled'
      AND start_time < ${end.toISOString()}::timestamptz
      AND (start_time + (duration_minutes || ' minutes')::interval) > ${start.toISOString()}::timestamptz;
  `;
  return (rows[0]?.count || 0) === 0;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    birthday: row.birthday || undefined,
    joinDate: new Date(row.join_date),
    lastVisit: new Date(row.last_visit),
    visitsCount: row.visits_count,
    totalSpent: Number(row.total_spent),
    notes: row.notes || "",
    preferences: row.preferences || [],
    source: row.source as Customer["source"],
    marketingConsent: row.marketing_consent,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<CustomerRow[]>`
    SELECT *
    FROM customers
    ORDER BY last_visit DESC;
  `;
  return rows.map(mapCustomer);
}

export async function upsertCustomerFromBooking(input: {
  name: string;
  phone: string;
  totalSpent: number;
  source: Customer["source"];
  notes?: string;
}): Promise<Customer> {
  const sql = getSql();
  await ensureSchema();
  const existingRows = await sql<CustomerRow[]>`
    SELECT *
    FROM customers
    WHERE phone = ${input.phone}
    LIMIT 1;
  `;
  if (existingRows.length > 0) {
    const row = existingRows[0];
    const rows = await sql<CustomerRow[]>`
      UPDATE customers
      SET
        name = ${input.name || row.name},
        last_visit = now(),
        visits_count = visits_count + 1,
        total_spent = total_spent + ${input.totalSpent},
        notes = ${input.notes ? `${row.notes || ""}\n${input.notes}`.trim() : row.notes},
        updated_at = now()
      WHERE phone = ${input.phone}
      RETURNING *;
    `;
    return mapCustomer(rows[0]);
  }
  const rows = await sql<CustomerRow[]>`
    INSERT INTO customers (
      id,
      name,
      phone,
      email,
      birthday,
      join_date,
      last_visit,
      visits_count,
      total_spent,
      notes,
      preferences,
      source,
      marketing_consent
    )
    VALUES (
      ${crypto.randomUUID()},
      ${input.name},
      ${input.phone},
      '',
      null,
      now(),
      now(),
      1,
      ${input.totalSpent},
      ${input.notes || "נוצר אוטומטית"},
      ${[]}::text[],
      ${input.source},
      false
    )
    RETURNING *;
  `;
  return mapCustomer(rows[0]);
}

export async function saveCustomer(input: Customer): Promise<Customer> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<CustomerRow[]>`
    INSERT INTO customers (
      id,
      name,
      phone,
      email,
      birthday,
      join_date,
      last_visit,
      visits_count,
      total_spent,
      notes,
      preferences,
      source,
      marketing_consent
    )
    VALUES (
      ${input.id || crypto.randomUUID()},
      ${input.name},
      ${input.phone},
      ${input.email || ""},
      ${input.birthday || null},
      ${input.joinDate.toISOString()}::timestamptz,
      ${input.lastVisit.toISOString()}::timestamptz,
      ${input.visitsCount},
      ${input.totalSpent},
      ${input.notes || ""},
      ${input.preferences || []}::text[],
      ${input.source},
      ${input.marketingConsent}
    )
    ON CONFLICT (phone)
    DO UPDATE SET
      name = ${input.name},
      email = ${input.email || ""},
      birthday = ${input.birthday || null},
      last_visit = ${input.lastVisit.toISOString()}::timestamptz,
      visits_count = ${input.visitsCount},
      total_spent = ${input.totalSpent},
      notes = ${input.notes || ""},
      preferences = ${input.preferences || []}::text[],
      source = ${input.source},
      marketing_consent = ${input.marketingConsent},
      updated_at = now()
    RETURNING *;
  `;
  return mapCustomer(rows[0]);
}

function mapSocialThread(row: SocialThreadRow): SocialMessage {
  const history = (row.chat_history || []).map((h: any) => ({
    ...h,
    timestamp: h.timestamp ? new Date(h.timestamp) : new Date(),
  }));
  return {
    id: row.id,
    platform: row.platform as SocialMessage["platform"],
    externalId: row.external_id || undefined,
    senderName: row.sender_name,
    text: "",
    timestamp: new Date(row.last_message_at),
    isProcessed: row.is_processed,
    type: row.type as SocialMessage["type"],
    chatHistory: history,
  };
}

export async function listSocialThreads(): Promise<SocialMessage[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<SocialThreadRow[]>`
    SELECT *
    FROM social_threads
    ORDER BY last_message_at DESC;
  `;
  return rows.map(mapSocialThread);
}

export async function getSocialThreadById(
  id: string
): Promise<SocialMessage | null> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<SocialThreadRow[]>`
    SELECT *
    FROM social_threads
    WHERE id = ${id}
    LIMIT 1;
  `;
  return rows.length ? mapSocialThread(rows[0]) : null;
}

export async function getSocialThreadByExternal(
  platform: string,
  externalId: string
): Promise<SocialMessage | null> {
  const sql = getSql();
  await ensureSchema();
  const rows = await sql<SocialThreadRow[]>`
    SELECT *
    FROM social_threads
    WHERE platform = ${platform} AND external_id = ${externalId}
    LIMIT 1;
  `;
  return rows.length ? mapSocialThread(rows[0]) : null;
}

export async function saveSocialThread(input: {
  id?: string;
  platform: SocialMessage["platform"];
  externalId?: string | null;
  senderName: string;
  type: SocialMessage["type"];
  isProcessed: boolean;
  chatHistory: ChatMessage[];
  lastMessageAt: Date;
}): Promise<SocialMessage> {
  const sql = getSql();
  await ensureSchema();
  const id = input.id || crypto.randomUUID();
  const rows = await sql<SocialThreadRow[]>`
    INSERT INTO social_threads (
      id,
      platform,
      external_id,
      sender_name,
      type,
      is_processed,
      chat_history,
      last_message_at
    )
    VALUES (
      ${id},
      ${input.platform},
      ${input.externalId || null},
      ${input.senderName},
      ${input.type},
      ${input.isProcessed},
      ${JSON.stringify(input.chatHistory)}::jsonb,
      ${input.lastMessageAt.toISOString()}::timestamptz
    )
    ON CONFLICT (id)
    DO UPDATE SET
      external_id = ${input.externalId || null},
      sender_name = ${input.senderName},
      type = ${input.type},
      is_processed = ${input.isProcessed},
      chat_history = ${JSON.stringify(input.chatHistory)}::jsonb,
      last_message_at = ${input.lastMessageAt.toISOString()}::timestamptz,
      updated_at = now()
    RETURNING *;
  `;
  return mapSocialThread(rows[0]);
}
