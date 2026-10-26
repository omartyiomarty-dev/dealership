import { db } from "@/db";
import { categories, brands, vehicleModels } from "@/db/schema";
import { asc } from "drizzle-orm";
import VehicleForm from "@/components/admin/VehicleForm";
import { getRecommendationOptions } from "@/lib/sales";

export default async function NewVehiclePage() {
  const [cats, br, mo, recOptions] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.nameEn)),
    db.select().from(vehicleModels),
    getRecommendationOptions(null),
  ]);
  return <VehicleForm vehicle={null} categories={cats} brands={br} models={mo} recOptions={recOptions} />;
}
