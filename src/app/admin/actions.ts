"use server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, brands, categories, inquiries, media, services, vehicleCategories, vehicleImages, vehicleModels, vehicles } from "@/db/schema";
import { AVAILABILITIES, INQUIRY_STATUSES, type Availability } from "@/lib/constants";
import { safeEnum, safeId, safeIdList, safeText } from "@/lib/safe";
import { adminCount, clearSessionCookie, getCurrentAdmin, hashPassword, requireAdmin, requirePrimaryAdmin, setSessionCookie, verifyPassword } from "@/lib/auth";
import { getSeoSettings, getSiteSettings, saveSetting, type SiteSettings, type HomeSettings, type SeoSettings, type PolicySettings, defaultSite, defaultHome, defaultSeo, defaultPolicies } from "@/lib/settings";
import { nextStockNumber, slugify } from "@/lib/vehicles";
import { DEFAULT_RECOMMENDATIONS_KEY } from "@/lib/sales";
import {
  adminAccountSchema,
  categorySchema,
  homeSettingsSchema,
  namePairSchema,
  policiesSchema,
  passwordSchema,
  profileSchema,
  quickUpdateSchema,
  seoSettingsSchema,
  serviceSchema,
  siteSettingsSchema,
  vehicleSchema,
  type CategoryInput,
  type ServiceInput,
  type VehicleInput,
} from "@/lib/validators";

export type { VehicleInput } from "@/lib/validators";
import { invalidate } from "@/lib/cache";

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : "error";
  if (msg === "UNAUTHORIZED") return { ok: false, error: "unauthorized" };
  if (msg === "FORBIDDEN") return { ok: false, error: "forbidden" };
  if (e instanceof z.ZodError) return { ok: false, error: "validation: " + e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ") };
  console.error(e);
  return { ok: false, error: msg };
}


/** Validates an id coming from the client before it reaches a query. */
function readId(value: unknown): number | null {
  const n = safeId(value);
  return n ?? null;
}

function revalidateAll() {
  revalidatePath("/", "layout");
  // drop cached public reads so changes are visible immediately (no waiting for TTL)
  invalidate("vehicles", "categories", "setting:site", "setting:home", "setting:seo", "setting:policies");
}
const invalidateVehicles = () => invalidate("vehicles");
const invalidateCategories = () => invalidate("categories");

// ---------- AUTH ----------
/**
 * Login throttling. Keys are lower-cased email addresses; a normalised hash is
 * used as the map key so an attacker cannot flood memory with unlimited huge
 * strings. Swept periodically so entries cannot accumulate without bound.
 */
const loginFailures = new Map<string, { n: number; until: number }>();
const LOCK_LIMIT = 5;
const LOCK_WINDOW = 15 * 60 * 1000;
let lastLockSweep = 0;

function lockKey(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 24);
}

function registerFailure(key: string) {
  const now = Date.now();
  if (now - lastLockSweep > 60_000) {
    lastLockSweep = now;
    for (const [k, v] of loginFailures) {
      if (v.until < now) loginFailures.delete(k);
    }
  }
  const cur = loginFailures.get(key);
  loginFailures.set(key, { n: (cur?.n ?? 0) + 1, until: now + LOCK_WINDOW });
}

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().slice(0, 150).toLowerCase();
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const key = lockKey(email);
  const f = loginFailures.get(key);
  if (f && f.until > Date.now() && f.n >= LOCK_LIMIT) return { ok: false, error: "locked" };
  const [a] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!a || !verifyPassword(password, a.passwordHash)) {
    registerFailure(key);
    return { ok: false, error: "invalid" };
  }
  loginFailures.delete(key);
  await setSessionCookie(a.id, a.tokenVersion);
  redirect("/admin");
}

export async function setupAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if ((await adminCount()) > 0) return { ok: false, error: "exists" };
  const parsed = adminAccountSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, error: "validation" };
  // isPrimary has a partial unique index, so a concurrent double-submit cannot
  // create two primary admins — the second insert fails at the database level.
  let a;
  try {
    [a] = await db
      .insert(admins)
      .values({ name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash: hashPassword(parsed.data.password), isPrimary: true })
      .returning();
  } catch {
    return { ok: false, error: "exists" };
  }
  await setSessionCookie(a.id, a.tokenVersion);
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const me = await requireAdmin();
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    if (!passwordSchema.safeParse({ next }).success) return { ok: false, error: "weak" };
    const [a] = await db.select().from(admins).where(eq(admins.id, me.id)).limit(1);
    if (!a || !verifyPassword(current, a.passwordHash)) return { ok: false, error: "invalid" };
    const v = a.tokenVersion + 1;
    await db.update(admins).set({ passwordHash: hashPassword(next), tokenVersion: v, updatedAt: new Date() }).where(eq(admins.id, me.id));
    await setSessionCookie(me.id, v);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProfileAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const me = await requireAdmin();
    const d = profileSchema.parse({ name: fd.get("name"), email: fd.get("email") });
    await db.update(admins).set({ name: d.name, email: d.email.toLowerCase(), updatedAt: new Date() }).where(eq(admins.id, me.id));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// Only the primary admin may create/remove additional admins
export async function createAdminAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requirePrimaryAdmin();
    const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(150), password: z.string().min(10).max(200) });
    const d = schema.parse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") });
    await db.insert(admins).values({ name: d.name, email: d.email.toLowerCase(), passwordHash: hashPassword(d.password), isPrimary: false });
    revalidatePath("/admin/account");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAdminAction(id: number): Promise<ActionResult> {
  try {
    const me = await requirePrimaryAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    if (vid === me.id) return { ok: false, error: "self" };
    await db.delete(admins).where(and(eq(admins.id, vid), eq(admins.isPrimary, false)));
    revalidatePath("/admin/account");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function resetAdminPasswordAction(id: number, password: string): Promise<ActionResult> {
  try {
    await requirePrimaryAdmin();
    if (!passwordSchema.safeParse({ next: password }).success) return { ok: false, error: "weak" };
    await db.update(admins).set({ passwordHash: hashPassword(password), tokenVersion: sql`${admins.tokenVersion} + 1`, updatedAt: new Date() }).where(and(eq(admins.id, id), eq(admins.isPrimary, false)));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- SETTINGS ----------
export async function saveSiteSettingsAction(data: SiteSettings): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = siteSettingsSchema.parse({ ...defaultSite, ...data });
    await saveSetting("site", d);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveHomeSettingsAction(data: HomeSettings): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = homeSettingsSchema.parse({ ...defaultHome, ...data });
    await saveSetting("home", d);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSeoSettingsAction(data: SeoSettings): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = seoSettingsSchema.parse({ ...defaultSeo, ...data });
    await saveSetting("seo", d);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function savePoliciesAction(data: PolicySettings): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = policiesSchema.parse({ ...defaultPolicies, ...data });
    await saveSetting("policies", d);
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- CATEGORIES ----------
export type { CategoryInput } from "@/lib/validators";

async function uniqueSlug(table: "categories" | "vehicles", base: string, excludeId?: number): Promise<string> {
  let s = slugify(base) || `${table}-${Date.now()}`;
  const root = s;
  for (let i = 2; i < 500; i++) {
    const rows =
      table === "categories"
        ? await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, s))
        : await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.slug, s));
    if (rows.length === 0 || (excludeId && rows[0].id === excludeId)) return s;
    s = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function saveCategoryAction(id: number | null, input: CategoryInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = categorySchema.parse(input);
    if (id) {
      await db.update(categories).set({ ...d, updatedAt: new Date() }).where(eq(categories.id, id));
      invalidateCategories();
      revalidateAll();
      return { ok: true, id };
    }
    const slug = await uniqueSlug("categories", d.nameEn || d.nameAr);
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${categories.sortOrder}),0)::int` }).from(categories);
    const [row] = await db.insert(categories).values({ ...d, slug, sortOrder: max + 1 }).returning({ id: categories.id });
    invalidateCategories();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    // vehicle_categories rows cascade; vehicles themselves are untouched
    await db.delete(categories).where(eq(categories.id, vid));
    invalidateCategories();
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderCategoriesAction(ids: number[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const clean = safeIdList(ids).slice(0, 500);
    await db.transaction(async (tx) => {
      for (let i = 0; i < clean.length; i++) await tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, clean[i]));
    });
    invalidateCategories();
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- BRANDS / MODELS ----------
export async function saveBrandAction(id: number | null, nameAr: string, nameEn: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = namePairSchema.parse({ nameAr, nameEn });
    if (id) await db.update(brands).set(d).where(eq(brands.id, id));
    else await db.insert(brands).values(d);
    revalidatePath("/admin/brands");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteBrandAction(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    await db.delete(brands).where(eq(brands.id, vid));
    revalidatePath("/admin/brands");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function saveModelAction(brandId: number, nameAr: string, nameEn: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = namePairSchema.parse({ nameAr, nameEn });
    await db.insert(vehicleModels).values({ brandId, ...d });
    revalidatePath("/admin/brands");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteModelAction(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    await db.delete(vehicleModels).where(eq(vehicleModels.id, vid));
    revalidatePath("/admin/brands");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- SERVICES ----------
export type { ServiceInput } from "@/lib/validators";
export async function saveServiceAction(id: number | null, input: ServiceInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = serviceSchema.parse(input);
    if (id) await db.update(services).set({ ...d, updatedAt: new Date() }).where(eq(services.id, id));
    else {
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${services.sortOrder}),0)::int` }).from(services);
      await db.insert(services).values({ ...d, sortOrder: max + 1 });
    }
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteServiceAction(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    await db.delete(services).where(eq(services.id, vid));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function reorderServicesAction(ids: number[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const clean = safeIdList(ids).slice(0, 500);
    await db.transaction(async (tx) => {
      for (let i = 0; i < clean.length; i++) await tx.update(services).set({ sortOrder: i }).where(eq(services.id, clean[i]));
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- INQUIRIES ----------
export async function setInquiryStatusAction(id: number, status: "new" | "contacted" | "closed"): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    const ok = safeEnum(status, INQUIRY_STATUSES);
    if (!ok) return { ok: false, error: "validation" };
    await db.update(inquiries).set({ status: ok }).where(eq(inquiries.id, vid));
    revalidatePath("/admin/inquiries");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteInquiryAction(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    await db.delete(inquiries).where(eq(inquiries.id, vid));
    revalidatePath("/admin/inquiries");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- MEDIA ----------
/** Reports where a media file is referenced. Internal only (not exported to clients). */
async function mediaUsage(id: number): Promise<string[]> {
  const out: string[] = [];
  const vi = await db.select({ v: vehicleImages.vehicleId }).from(vehicleImages).where(eq(vehicleImages.mediaId, id));
  const vm = await db.select({ v: vehicles.id }).from(vehicles).where(eq(vehicles.mainImageId, id));
  const ids = new Set([...vi.map((r) => r.v), ...vm.map((r) => r.v)]);
  if (ids.size) out.push(`vehicles(${[...ids].join(",")})`);
  const c = await db.select({ id: categories.id }).from(categories).where(eq(categories.iconMediaId, id));
  if (c.length) out.push(`categories(${c.map((x) => x.id).join(",")})`);
  const s = await getSiteSettings();
  if (s.logoMediaId === id) out.push("logo");
  if (s.heroMediaId === id) out.push("hero");
  const seo = await getSeoSettings();
  if (seo.ogImageMediaId === id) out.push("og-image");
  return out;
}

export async function deleteMediaAction(id: number, force = false): Promise<ActionResult> {
  try {
    await requireAdmin();
    const usage = await mediaUsage(id);
    if (usage.length > 0 && !force) return { ok: false, error: "in_use: " + usage.join(", ") };
    await db.delete(media).where(eq(media.id, id));
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function updateMediaAltAction(id: number, alt: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    await db.update(media).set({ alt: safeText(alt, 200) }).where(eq(media.id, vid));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
// ---------- VEHICLES ----------


export async function saveVehicleAction(id: number | null, input: VehicleInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = vehicleSchema.parse(input);
    const isRent = d.transactionType === "rent";
    const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
    const values = {
      transactionType: d.transactionType,
      vehicleType: d.vehicleType,
      make: d.make,
      model: d.model,
      trim: clean(d.trim),
      titleAr: d.titleAr,
      titleEn: d.titleEn,
      descriptionAr: clean(d.descriptionAr),
      descriptionEn: clean(d.descriptionEn),
      year: d.year,
      price: d.price === null ? null : String(d.price),
      rentalPeriod: isRent ? d.rentalPeriod ?? null : null,
      rentalDeposit: isRent && d.rentalDeposit !== null ? String(d.rentalDeposit) : null,
      rentalConditionsAr: isRent ? clean(d.rentalConditionsAr) : null,
      rentalConditionsEn: isRent ? clean(d.rentalConditionsEn) : null,
      installmentAvailable: !isRent && d.installmentAvailable,
      installmentInfoAr: !isRent ? clean(d.installmentInfoAr) : null,
      installmentInfoEn: !isRent ? clean(d.installmentInfoEn) : null,
      mileage: d.mileage,
      condition: d.condition,
      transmission: d.transmission ?? null,
      fuelType: d.fuelType ?? null,
      engineCapacity: clean(d.engineCapacity),
      bodyStyle: clean(d.bodyStyle),
      exteriorColor: clean(d.exteriorColor),
      interiorColor: clean(d.interiorColor),
      location: clean(d.location),
      featuresAr: d.featuresAr.map((f) => f.trim()).filter(Boolean),
      featuresEn: d.featuresEn.map((f) => f.trim()).filter(Boolean),
      mainImageId: d.images[0] ?? null,
      status: d.status,
      availability: d.availability,
      featured: d.featured,
      seoTitle: clean(d.seoTitle),
      seoDescription: clean(d.seoDescription),
      updatedAt: new Date(),
    };
    const vehicleId = await db.transaction(async (tx) => {
      let vid = id;
      if (vid) {
        await tx.update(vehicles).set(values).where(eq(vehicles.id, vid));
      } else {
        const stockNumber = await nextStockNumber();
        const slug = await uniqueSlug("vehicles", `${d.make}-${d.model}-${d.year}-${stockNumber}`);
        const [row] = await tx.insert(vehicles).values({ ...values, stockNumber, slug }).returning({ id: vehicles.id });
        vid = row.id;
      }
      await tx.delete(vehicleImages).where(eq(vehicleImages.vehicleId, vid));
      if (d.images.length) await tx.insert(vehicleImages).values(d.images.map((m, i) => ({ vehicleId: vid!, mediaId: m, sortOrder: i })));
      await tx.delete(vehicleCategories).where(eq(vehicleCategories.vehicleId, vid));
      const uniqueCats = [...new Set(d.categoryIds)];
      if (uniqueCats.length) await tx.insert(vehicleCategories).values(uniqueCats.map((c) => ({ vehicleId: vid!, categoryId: c }))).onConflictDoNothing();
      return vid;
    });
    invalidateVehicles();
    revalidateAll();
    return { ok: true, id: vehicleId };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Sets availability and keeps the sale/rental timestamp honest:
 * sold → stamps soldAt, rented → stamps rentedAt, anything else clears both.
 */
export async function setAvailabilityAction(id: number, availability: "available" | "reserved" | "sold" | "rented" | "unavailable"): Promise<ActionResult> {
  try {
    await requireAdmin();
    const value = safeEnum(availability, AVAILABILITIES);
    if (!value) return { ok: false, error: "validation" };
    const vid = safeId(id);
    if (!vid) return { ok: false, error: "validation" };

    const [existing] = await db.select({ transactionType: vehicles.transactionType }).from(vehicles).where(eq(vehicles.id, vid)).limit(1);
    if (!existing) return { ok: false, error: "not_found" };

    // A rental vehicle cannot be "sold" and a sale vehicle cannot be "rented".
    const allowed: Availability[] =
      existing.transactionType === "rent"
        ? ["available", "reserved", "rented", "unavailable"]
        : ["available", "reserved", "sold", "unavailable"];
    if (!allowed.includes(value)) return { ok: false, error: "conflict" };

    const now = new Date();
    await db
      .update(vehicles)
      .set({
        availability: value,
        ...(value === "sold" ? { soldAt: now } : {}),
        ...(value === "available" ? { soldAt: null } : {}),
        updatedAt: now,
      })
      .where(eq(vehicles.id, vid));
    invalidate("vehicles");
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Saves the admin-chosen alternative vehicles for one listing. */
export async function saveRecommendationsAction(id: number, ids: number[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = safeId(id);
    if (!vid) return { ok: false, error: "validation" };
    const clean = safeIdList(ids).slice(0, 6);
    if (clean.includes(vid)) return { ok: false, error: "self" };
    await db.update(vehicles).set({ recommendedIds: clean, updatedAt: new Date() }).where(eq(vehicles.id, vid));
    invalidate("vehicles");
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Site-wide default alternatives (fallback when a listing has none of its own). */
export async function saveGlobalRecommendationsAction(ids: number[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    const clean = safeIdList(ids).slice(0, 6);
    await saveSetting(DEFAULT_RECOMMENDATIONS_KEY, { defaultIds: clean });
    invalidate("vehicles");
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteVehicleAction(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    const vid = readId(id);
    if (!vid) return { ok: false, error: "validation" };
    await db.delete(vehicles).where(eq(vehicles.id, vid));
    invalidateVehicles();
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function quickUpdateVehicleAction(
  id: number,
  patch: { status?: "draft" | "published"; availability?: "available" | "reserved" | "sold" | "rented" | "unavailable"; featured?: boolean },
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const d = quickUpdateSchema.parse(patch);
    const vid = safeId(id);
    if (!vid) return { ok: false, error: "validation" };
    if (d.availability) {
      // delegate so the sold/rented timestamps are kept consistent
      return setAvailabilityAction(vid, d.availability);
    }
    await db.update(vehicles).set({ ...d, updatedAt: new Date() }).where(eq(vehicles.id, vid));
    invalidateVehicles();
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
