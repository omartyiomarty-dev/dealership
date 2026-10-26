import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
/**
 * Storage quota. Images are stored inside PostgreSQL, so unbounded uploads
 * would grow the database (and the backup size) without limit.
 */
const MAX_TOTAL_BYTES = Number(process.env.MAX_MEDIA_BYTES ?? 1_073_741_824); // 1 GB
const MAX_FILES = Number(process.env.MAX_MEDIA_COUNT ?? 3000);

async function currentUsage(): Promise<{ bytes: number; count: number }> {
  const { db } = await import("@/db");
  const { media } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");
  const [row] = await db
    .select({ bytes: sql<number>`coalesce(sum(${media.size}), 0)::float8`, count: sql<number>`count(*)::int` })
    .from(media);
  return { bytes: Number(row?.bytes ?? 0), count: Number(row?.count ?? 0) };
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const fd = await req.formData();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File);
  const alt = String(fd.get("alt") ?? "").slice(0, 200) || null;
  if (files.length === 0) return NextResponse.json({ error: "no_files" }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ error: "too_many" }, { status: 400 });
  const usage = await currentUsage();
  if (usage.count + files.length > MAX_FILES) {
    return NextResponse.json({ error: `quota_files: ${usage.count}/${MAX_FILES}` }, { status: 413 });
  }
  const out: { id: number; filename: string; width: number | null; height: number | null; size: number }[] = [];
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return NextResponse.json({ error: `type: ${f.name}` }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `size: ${f.name}` }, { status: 400 });
    const input = Buffer.from(await f.arrayBuffer());
    let buf: Buffer;
    let w: number | null = null;
    let h: number | null = null;
    let mime = "image/webp";
    try {
      // verify it's really an image and normalize/optimize it
      const img = sharp(input, { animated: f.type === "image/gif" }).rotate();
      const meta = await img.metadata();
      if (!meta.width || !meta.height) throw new Error("bad");
      if (f.type === "image/gif") {
        buf = input;
        mime = "image/gif";
        w = meta.width;
        h = meta.height;
      } else {
        const processed = await img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
        buf = processed.data;
        w = processed.info.width;
        h = processed.info.height;
      }
    } catch {
      return NextResponse.json({ error: `invalid_image: ${f.name}` }, { status: 400 });
    }
    if (usage.bytes + buf.length > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: `quota_bytes: ${usage.bytes}/${MAX_TOTAL_BYTES}` }, { status: 413 });
    }
    usage.bytes += buf.length;
    usage.count += 1;
    const safeName = f.name.replace(/[^\w.\-]+/g, "_").slice(0, 120).replace(/\.[^.]+$/, "") + (mime === "image/gif" ? ".gif" : ".webp");
    const [row] = await db.insert(media).values({ filename: safeName, mimeType: mime, size: buf.length, width: w, height: h, alt, data: buf }).returning({ id: media.id });
    out.push({ id: row.id, filename: safeName, width: w, height: h, size: buf.length });
  }
  return NextResponse.json({ files: out });
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const perPage = 40;
  const rows = await db
    .select({ id: media.id, filename: media.filename, mimeType: media.mimeType, size: media.size, width: media.width, height: media.height, alt: media.alt, createdAt: media.createdAt })
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);
  return NextResponse.json({ items: rows });
}
