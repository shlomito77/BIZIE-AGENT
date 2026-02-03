import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getClientIp } from "./_auth";

type MemoryBucket = {
  count: number;
  resetTime: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function getMemoryKey(key: string) {
  return `mem:${key}`;
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redis = Redis.fromEnv();
  }
  return redis;
}

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const key = `${limit}:${windowSeconds}`;
  if (limiterCache.has(key)) return limiterCache.get(key)!;
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
  });
  limiterCache.set(key, limiter);
  return limiter;
}

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucketKey = getMemoryKey(key);
  const bucket = memoryBuckets.get(bucketKey);
  if (!bucket || now > bucket.resetTime) {
    memoryBuckets.set(bucketKey, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function enforceRateLimit(params: {
  req: VercelRequest;
  res: VercelResponse;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<boolean> {
  const { req, res, key, limit, windowMs } = params;
  const ip = getClientIp(req);
  const finalKey = `${key}:${ip}`;

  const limiter = getLimiter(limit, windowMs);
  if (limiter) {
    const result = await limiter.limit(finalKey);
    if (!result.success) {
      res.status(429).json({ error: "Rate limit exceeded. Try again later." });
      return false;
    }
    return true;
  }

  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Rate limit not configured" });
    return false;
  }

  // Memory fallback for local/dev
  if (!memoryLimit(finalKey, limit, windowMs)) {
    res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    return false;
  }
  return true;
}
