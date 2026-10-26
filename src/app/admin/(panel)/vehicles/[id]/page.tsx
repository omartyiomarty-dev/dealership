import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, brands, vehicleModels } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getVehicleById } from "@/lib/vehicles";
import { getRecommendationOptions } from "@/lib/sales";
import { safeId } from "@/lib/safe";
import VehicleForm from "@/components/admin/VehicleForm";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = safeId(id);
  if (!n) notFound();
  const v = await getVehicleById(n);
  if (!v) notFound();
  const [cats, br, mo, recOptions] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.nameEn)),
    db.select().from(vehicleModels),
    getRecommendationOptions(n),
  ]);
  return <VehicleForm vehicle={v} categories={cats} brands={br} models={mo} recOptions={recOptions} />;
}
