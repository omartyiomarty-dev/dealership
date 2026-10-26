import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { parseSearchParams, searchVehiclesPublic } from "@/lib/vehicles";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public read endpoint. Limit is deliberately high (normal browsing stays far
 * below it) but still caps abusive scripted scraping during a spike.
 */
const SEARCH_LIMIT = Number(process.env.SEARCH_RPS_LIMIT ?? 300);
const SEARCH_WINDOW = 60_000;

export async function GET(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || (req.headers.get("x-real-ip") ?? "unknown");
  const key = createHash("sha256").update(`search:${ip}`).digest("hex").slice(0, 24);
  const gate = rateLimit(key, SEARCH_LIMIT, SEARCH_WINDOW);
  if (!gate.ok) {
    return NextResponse.json(
      { items: [], total: 0, page: 1, perPage: 12, error: "rate" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const sp: Record<string, string[]> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    (sp[k] ??= []).push(v);
  });
  try {
    const params = parseSearchParams(sp);
    const result = await searchVehiclesPublic(params);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Log the real cause server-side, but never leak it to the client.
    console.error("[search]", e instanceof Error ? e.message : e);
    return NextResponse.json({ items: [], total: 0, page: 1, perPage: 12, error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
