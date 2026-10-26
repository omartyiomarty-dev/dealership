import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { inquiries, vehicles } from "@/db/schema";
import { hashIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { safeId } from "@/lib/safe";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[\d+\s()-]{7,20}$/),
  email: z.string().trim().email().max(150).optional().or(z.literal("")),
  message: z.string().trim().min(3).max(2000),
  vehicleId: z.number().int().positive().optional().nullable(),
  transactionType: z.string().max(10).optional().nullable(),
  website: z.string().optional().nullable(), // honeypot
});

/**
 * In-memory sliding rate limiter (per process).
 * Entries expire on read, and the map is pruned periodically so it cannot grow
 * without bound under a flood of unique spoofed IPs.
 */
const hits = new Map<string, number[]>();
let lastSweep = 0;

function rateLimited(key: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();

  // Periodic sweep: drop stale entries so memory stays bounded.
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, times] of hits) {
      const alive = times.filter((t) => now - t < windowMs);
      if (alive.length === 0) hits.delete(k);
      else hits.set(k, alive);
    }
  }

  const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    hits.set(key, times);
    return true;
  }
  times.push(now);
  hits.set(key, times);
  return false;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // bot – silently ignore
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipH = hashIp(ip);
  const gate = rateLimit(`inq:${ipH}`, 5, 10 * 60 * 1000);
  if (!gate.ok) return NextResponse.json({ error: "rate" }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
  const dup = rateLimit(`dup:${ipH}:${d.phone}:${d.message.length}`, 1, 60_000);
  if (!dup.ok) return NextResponse.json({ ok: true }); // silently absorb the repeat

  let vehicleId: number | null = null;
  if (d.vehicleId) {
    const [v] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, d.vehicleId)).limit(1);
    vehicleId = v?.id ?? null;
  }
  await db.insert(inquiries).values({
    name: d.name,
    phone: d.phone,
    email: d.email || null,
    message: d.message,
    vehicleId,
    transactionType: d.transactionType === "sale" || d.transactionType === "rent" ? d.transactionType : null,
    ipHash: ipH,
  });
  return NextResponse.json({ ok: true });
}
