import { db } from "@/db";
import { media } from "@/db/schema";
import { desc } from "drizzle-orm";
import MediaManager from "./MediaManager";

export default async function MediaPage() {
  const rows = await db.select({ id: media.id, filename: media.filename, mimeType: media.mimeType, size: media.size, width: media.width, height: media.height, alt: media.alt, createdAt: media.createdAt }).from(media).orderBy(desc(media.createdAt)).limit(300);
  return <MediaManager items={rows} />;
}
