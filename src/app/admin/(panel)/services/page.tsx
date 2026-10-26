import { db } from "@/db";
import { services } from "@/db/schema";
import { asc } from "drizzle-orm";
import ServicesManager from "./ServicesManager";

export default async function ServicesPage() {
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));
  return <ServicesManager items={rows} />;
}
