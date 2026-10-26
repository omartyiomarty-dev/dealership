import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeId } from "@/lib/safe";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = safeId(id);
  if (!n) return new NextResponse("Not found", { status: 404 });
  const [m] = await db
    .select({ mimeType: media.mimeType, size: media.size, data: media.data })
    .from(media)
    .where(eq(media.id, n))
    .limit(1);
  // Missing media must be cacheable only for a moment: the record may be
  // uploaded a second later, and a year-long 404 would pin a broken image.
  if (!m) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=10, must-revalidate" },
    });
  }
  // Never select the bytea body for HEAD-style checks; browsers mostly need the validator.
  const etag = `"${n}-${m.size}"`;
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  return new NextResponse(new Uint8Array(m.data), {
    headers: {
      "Content-Type": m.mimeType,
      "Content-Length": String(m.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
      "Content-Disposition": `inline; filename="${n}"`,
    },
  });
}
