import type { MetadataRoute } from "next";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getSeoSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoSettings();
  const base = (seo.siteUrl || "http://localhost:3000").replace(/\/$/, "");
  const rows = await db.select({ slug: vehicles.slug, updatedAt: vehicles.updatedAt }).from(vehicles).where(and(eq(vehicles.status, "published"), ne(vehicles.availability, "sold")));
  const statics = ["", "/vehicles", "/choose", "/about", "/services", "/contact", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
  return [...statics, ...rows.map((r) => ({ url: `${base}/vehicles/${r.slug}`, lastModified: r.updatedAt }))];
}
