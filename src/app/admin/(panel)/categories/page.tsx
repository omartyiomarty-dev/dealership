import { db } from "@/db";
import { categories, vehicleCategories } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import CategoriesManager from "./CategoriesManager";

export default async function CategoriesPage() {
  const rows = await db
    .select({ c: categories, count: sql<number>`(select count(*) from ${vehicleCategories} where ${vehicleCategories.categoryId} = ${categories.id})::int` })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return <CategoriesManager items={rows.map((r) => ({ ...r.c, count: r.count }))} />;
}
