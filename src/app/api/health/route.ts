import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSchema } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

/** Liveness + DB check. Also completes automatic schema setup if boot-time setup failed. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const schema = await ensureSchema();
    return Response.json({ ok: true, schema });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
