import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "";
  const parsed = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (parsed.length > 0) return parsed;
  if (process.env.NODE_ENV !== "production") return DEV_ORIGINS;
  return [];
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser or same-origin without Origin
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) return false;
  return allowed.includes(origin);
}

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined;

  if (!isOriginAllowed(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return false;
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Telegram-Bot-Api-Secret-Token"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  return true;
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== "OPTIONS") return false;
  if (!applyCors(req, res)) return true;
  res.status(200).end();
  return true;
}

export function requireBasicAuth(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (!user || !pass) {
    res.status(500).json({ error: "Basic auth not configured" });
    return false;
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  const encoded = header.slice("Basic ".length).trim();
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const [givenUser, givenPass] = decoded.split(":");

  if (givenUser !== user || givenPass !== pass) {
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

export function getClientIp(req: VercelRequest): string {
  const xf = req.headers["x-forwarded-for"];
  if (Array.isArray(xf)) return xf[0] || "unknown";
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  const conn = (req as any).connection?.remoteAddress;
  return conn || "unknown";
}

export function requireTelegramSecret(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  const expected = process.env.TELEGRAM_SECRET_TOKEN;
  if (!expected) return true;
  const received = req.headers["x-telegram-bot-api-secret-token"];
  if (received !== expected) {
    res.status(401).json({ error: "Invalid Telegram secret token" });
    return false;
  }
  return true;
}
