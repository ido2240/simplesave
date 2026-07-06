// Lightweight sliding-window rate limiter for auth actions and API routes.
// In-memory per server instance — best-effort on serverless (each warm lambda
// keeps its own window), which still blunts brute-force and runaway loops.
// Swap for Upstash/Redis if hard multi-instance guarantees are ever needed.
import "server-only";
import { headers } from "next/headers";

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 10_000; // memory backstop

export interface RateLimitOptions {
  /** identifier namespace, e.g. "login" */
  name: string;
  /** max hits per window */
  limit: number;
  /** window length in ms */
  windowMs: number;
}

async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Returns true when the caller is within the limit (and records the hit). */
export async function rateLimitOk(opts: RateLimitOptions): Promise<boolean> {
  const key = `${opts.name}:${await clientKey()}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < opts.windowMs);
  if (hits.length >= opts.limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  if (buckets.size > MAX_BUCKETS) buckets.clear();
  buckets.set(key, hits);
  return true;
}

export const RATE_LIMIT_MESSAGE = "יותר מדי ניסיונות — המתינו רגע ונסו שוב.";
