import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoSettings();
  const base = (seo.siteUrl || "").replace(/\/$/, "");
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }], sitemap: base ? `${base}/sitemap.xml` : undefined };
}
