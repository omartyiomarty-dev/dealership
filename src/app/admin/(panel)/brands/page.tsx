import { db } from "@/db";
import { brands, vehicleModels } from "@/db/schema";
import { asc } from "drizzle-orm";
import BrandsManager from "./BrandsManager";

export default async function BrandsPage() {
  const [b, m] = await Promise.all([db.select().from(brands).orderBy(asc(brands.nameEn)), db.select().from(vehicleModels).orderBy(asc(vehicleModels.nameEn))]);
  return <BrandsManager brands={b} models={m} />;
}
