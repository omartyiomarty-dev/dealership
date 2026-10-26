"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveVehicleAction, saveRecommendationsAction, type VehicleInput } from "@/app/admin/actions";
import type { Category, Brand, VehicleModel } from "@/db/schema";
import type { FullVehicle } from "@/lib/vehicles";
import type { RecOption } from "@/lib/sales";
import { Field, MultiImageUploader, useP, useToast } from "./ui";
import RecommendationPicker from "./RecommendationPicker";
import { I } from "@/components/Icon";
import { useT } from "@/components/LangProvider";
import { pick, enumLabel, VEHICLE_TYPES } from "@/lib/i18n";

type Props = { vehicle: FullVehicle | null; categories: Category[]; brands: Brand[]; models: VehicleModel[]; recOptions: RecOption[] };

type F = {
  transactionType: "sale" | "rent" | "";
  vehicleType: string;
  make: string; model: string; trim: string; titleAr: string; titleEn: string; descriptionAr: string; descriptionEn: string;
  year: string; price: string; rentalPeriod: "daily" | "weekly" | "monthly" | ""; rentalDeposit: string; rentalConditionsAr: string; rentalConditionsEn: string;
  installmentAvailable: boolean; installmentInfoAr: string; installmentInfoEn: string;
  mileage: string; condition: "new" | "used"; transmission: string; fuelType: string; engineCapacity: string; bodyStyle: string; exteriorColor: string; interiorColor: string; location: string;
  featuresAr: string; featuresEn: string; images: number[]; categoryIds: number[]; status: "draft" | "published"; availability: "available" | "reserved" | "sold" | "rented" | "unavailable"; featured: boolean; seoTitle: string; seoDescription: string;
  recommendedIds: number[];
  soldAt: string | null;
};

function init(v: FullVehicle | null): F {
  return {
    transactionType: (v?.transactionType as "sale" | "rent") ?? "",
    vehicleType: v?.vehicleType ?? "car",
    make: v?.make ?? "", model: v?.model ?? "", trim: v?.trim ?? "", titleAr: v?.titleAr ?? "", titleEn: v?.titleEn ?? "",
    descriptionAr: v?.descriptionAr ?? "", descriptionEn: v?.descriptionEn ?? "", year: v ? String(v.year) : "", price: v?.price ?? "",
    rentalPeriod: (v?.rentalPeriod as F["rentalPeriod"]) ?? "", rentalDeposit: v?.rentalDeposit ?? "", rentalConditionsAr: v?.rentalConditionsAr ?? "", rentalConditionsEn: v?.rentalConditionsEn ?? "",
    installmentAvailable: v?.installmentAvailable ?? false, installmentInfoAr: v?.installmentInfoAr ?? "", installmentInfoEn: v?.installmentInfoEn ?? "",
    mileage: v?.mileage != null ? String(v.mileage) : "", condition: (v?.condition as "new" | "used") ?? "used", transmission: v?.transmission ?? "", fuelType: v?.fuelType ?? "",
    engineCapacity: v?.engineCapacity ?? "", bodyStyle: v?.bodyStyle ?? "", exteriorColor: v?.exteriorColor ?? "", interiorColor: v?.interiorColor ?? "", location: v?.location ?? "",
    featuresAr: (v?.featuresAr ?? []).join("\n"), featuresEn: (v?.featuresEn ?? []).join("\n"), images: v?.images ?? [], categoryIds: v?.categories.map((c) => c.id) ?? [],
    status: (v?.status as "draft" | "published") ?? "draft", availability: (v?.availability as F["availability"]) ?? "available", featured: v?.featured ?? false,
    seoTitle: v?.seoTitle ?? "", seoDescription: v?.seoDescription ?? "",
    recommendedIds: v?.recommendedIds ?? [], soldAt: v?.soldAt ? new Date(v.soldAt).toISOString() : null,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 border-b border-gray-200 pb-2 font-bold text-gray-900">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function VehicleForm({ vehicle, categories, brands, models, recOptions }: Props) {
  const p = useP();
  const { lang } = useT();
  const router = useRouter();
  const [f, setF] = useState<F>(() => init(vehicle));
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string>("");
  const { show, el } = useToast();
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((s) => ({ ...s, [k]: v }));
  const isRent = f.transactionType === "rent";
  const brandModels = models.filter((m) => brands.find((b) => b.id === m.brandId && (b.nameEn === f.make || b.nameAr === f.make)));

  function validate(): string | null {
    if (!f.transactionType) return p("اختر نوع العرض أولاً", "Choose the offer type first");
    if (!f.make.trim() || !f.model.trim()) return p("الماركة والموديل مطلوبان", "Make and model are required");
    if (!f.titleAr.trim() || !f.titleEn.trim()) return p("العنوان بالعربية والإنجليزية مطلوب", "Arabic and English titles are required");
    const y = Number(f.year);
    if (!y || y < 1950) return p("سنة الصنع غير صحيحة", "Invalid year");
    if (isRent && f.price && !f.rentalPeriod) return p("حدد فترة الإيجار", "Select the rental period");
    return null;
  }

  function submit(status: "draft" | "published") {
    const err = validate();
    if (err) { setErrors(err); show(err, "err"); return; }
    setErrors("");
    const input: VehicleInput = {
      ...f,
      transactionType: f.transactionType as "sale" | "rent",
      vehicleType: f.vehicleType as VehicleInput["vehicleType"],
      year: Number(f.year),
      price: f.price === "" ? null : Number(f.price),
      rentalDeposit: f.rentalDeposit === "" ? null : Number(f.rentalDeposit),
      mileage: f.mileage === "" ? null : Number(f.mileage),
      rentalPeriod: f.rentalPeriod || null,
      transmission: (f.transmission || null) as VehicleInput["transmission"],
      fuelType: (f.fuelType || null) as VehicleInput["fuelType"],
      featuresAr: f.featuresAr.split("\n").map((s) => s.trim()).filter(Boolean),
      featuresEn: f.featuresEn.split("\n").map((s) => s.trim()).filter(Boolean),
      status,
    };
    start(async () => {
      const r = await saveVehicleAction(vehicle?.id ?? null, input);
      if (r.ok && r.id) await saveRecommendationsAction(r.id, f.recommendedIds);
      if (r.ok) {
        show(status === "published" ? p("تم النشر بنجاح", "Published successfully") : p("تم الحفظ", "Saved"));
        setF((s) => ({ ...s, status }));
        if (!vehicle && r.id) router.push(`/admin/vehicles/${r.id}`);
        else router.refresh();
      } else {
        setErrors(r.error);
        show(r.error, "err");
      }
    });
  }

  // STEP 1: choose transaction type
  if (!f.transactionType) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold">{p("إضافة مركبة", "Add Vehicle")}</h1>
        <p className="mb-6 text-gray-600">{p("هذه المركبة معروضة لـ؟", "What is this vehicle offered for?")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => set("transactionType", "sale")} className="card p-8 text-center transition hover:border-primary hover:shadow-md">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary"><I.tag className="h-7 w-7" /></span>
            <div className="mt-3 text-xl font-bold">{p("للبيع", "For Sale")}</div>
            <div className="mt-1 text-sm text-gray-500">{p("سعر بيع بالجنيه + تقسيط اختياري", "Sale price in EGP + optional installment")}</div>
          </button>
          <button type="button" onClick={() => set("transactionType", "rent")} className="card p-8 text-center transition hover:border-accent hover:shadow-md">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent/15 text-amber-600"><I.car className="h-7 w-7" /></span>
            <div className="mt-3 text-xl font-bold">{p("للإيجار", "For Rent")}</div>
            <div className="mt-1 text-sm text-gray-500">{p("سعر إيجار يومي/أسبوعي/شهري + شروط وتأمين", "Daily/weekly/monthly rate + conditions & deposit")}</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {el}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{vehicle ? p("تعديل مركبة", "Edit Vehicle") : p("إضافة سيارة", "Add Vehicle")} {vehicle && <span className="text-base font-normal text-gray-500" dir="ltr">#{vehicle.stockNumber}</span>}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className={`badge ${isRent ? "bg-accent text-white" : "bg-primary text-white"}`}>{isRent ? p("للإيجار", "For Rent") : p("للبيع", "For Sale")}</span>
            <button type="button" className="text-primary hover:underline" onClick={() => set("transactionType", isRent ? "sale" : "rent")}>{p("تغيير النوع", "Change type")}</button>
            {vehicle && <a href={`/vehicles/${vehicle.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><I.eye className="h-3.5 w-3.5" /> {p("معاينة", "Preview")}</a>}
          </div>
        </div>
        <Link href="/admin/vehicles" className="btn-outline">{p("رجوع للقائمة", "Back to list")}</Link>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 border-b border-gray-200 pb-2 font-bold text-gray-900">{p("نوع المركبة *", "Vehicle type *")}</h2>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_TYPES.map((vt) => (
            <button type="button" key={vt} aria-pressed={f.vehicleType === vt} onClick={() => set("vehicleType", vt)} className={`chip ${f.vehicleType === vt ? "chip-on" : "chip-off"}`}>{enumLabel(lang, vt)}</button>
          ))}
        </div>
      </section>

      <Section title={p("البيانات الأساسية", "Basic Information")}>
        <Field label={p("الماركة *", "Make *")}>
          <input list="brands-list" className="input" value={f.make} onChange={(e) => set("make", e.target.value)} />
          <datalist id="brands-list">{brands.map((b) => <option key={b.id} value={lang === "ar" ? b.nameAr : b.nameEn} />)}</datalist>
        </Field>
        <Field label={p("الموديل *", "Model *")}>
          <input list="models-list" className="input" value={f.model} onChange={(e) => set("model", e.target.value)} />
          <datalist id="models-list">{brandModels.map((m) => <option key={m.id} value={lang === "ar" ? m.nameAr : m.nameEn} />)}</datalist>
        </Field>
        <Field label={p("الفئة / التجهيز", "Trim")}><input className="input" value={f.trim} onChange={(e) => set("trim", e.target.value)} /></Field>
        <Field label={p("سنة الصنع *", "Year *")}><input className="input" type="number" value={f.year} onChange={(e) => set("year", e.target.value)} /></Field>
        <Field label={p("العنوان بالعربية *", "Arabic title *")}><input className="input" dir="rtl" value={f.titleAr} onChange={(e) => set("titleAr", e.target.value)} /></Field>
        <Field label={p("العنوان بالإنجليزية *", "English title *")}><input className="input" dir="ltr" value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} /></Field>
        <Field label={p("الوصف بالعربية", "Arabic description")}><textarea className="input min-h-28" dir="rtl" value={f.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></Field>
        <Field label={p("الوصف بالإنجليزية", "English description")}><textarea className="input min-h-28" dir="ltr" value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></Field>
      </Section>

      <Section title={isRent ? p("بيانات الإيجار", "Rental Details") : p("بيانات البيع", "Sale Details")}>
        <Field label={isRent ? p("سعر الإيجار (ج.م)", "Rental price (EGP)") : p("سعر البيع (ج.م)", "Sale price (EGP)")} hint={p("اتركه فارغاً لعرض «السعر عند الطلب»", "Leave empty to show “Price on request”")}>
          <input className="input" type="number" min={0} dir="ltr" value={f.price} onChange={(e) => set("price", e.target.value)} />
        </Field>
        {isRent ? (
          <>
            <Field label={p("فترة الإيجار", "Billing period")}>
              <select className="input" value={f.rentalPeriod} onChange={(e) => set("rentalPeriod", e.target.value as F["rentalPeriod"])}>
                <option value="">—</option><option value="daily">{p("يومي", "Daily")}</option><option value="weekly">{p("أسبوعي", "Weekly")}</option><option value="monthly">{p("شهري", "Monthly")}</option>
              </select>
            </Field>
            <Field label={p("التأمين (ج.م)", "Deposit (EGP)")}><input className="input" type="number" min={0} dir="ltr" value={f.rentalDeposit} onChange={(e) => set("rentalDeposit", e.target.value)} /></Field>
            <div />
            <Field label={p("شروط الإيجار (عربي)", "Rental conditions (Arabic)")}><textarea className="input" dir="rtl" value={f.rentalConditionsAr} onChange={(e) => set("rentalConditionsAr", e.target.value)} /></Field>
            <Field label={p("شروط الإيجار (إنجليزي)", "Rental conditions (English)")}><textarea className="input" dir="ltr" value={f.rentalConditionsEn} onChange={(e) => set("rentalConditionsEn", e.target.value)} /></Field>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={f.installmentAvailable} onChange={(e) => set("installmentAvailable", e.target.checked)} /> {p("متاح تقسيط", "Installment available")}</label>
            {f.installmentAvailable && (
              <>
                <Field label={p("تفاصيل التقسيط (عربي)", "Installment info (Arabic)")}><textarea className="input" dir="rtl" value={f.installmentInfoAr} onChange={(e) => set("installmentInfoAr", e.target.value)} /></Field>
                <Field label={p("تفاصيل التقسيط (إنجليزي)", "Installment info (English)")}><textarea className="input" dir="ltr" value={f.installmentInfoEn} onChange={(e) => set("installmentInfoEn", e.target.value)} /></Field>
              </>
            )}
          </>
        )}
      </Section>

      <Section title={p("المواصفات", "Specifications")}>
        <Field label={p("الكيلومترات", "Mileage (km)")}><input className="input" type="number" min={0} dir="ltr" value={f.mileage} onChange={(e) => set("mileage", e.target.value)} /></Field>
        <Field label={p("الحالة", "Condition")}><select className="input" value={f.condition} onChange={(e) => set("condition", e.target.value as "new" | "used")}><option value="used">{p("مستعملة", "Used")}</option><option value="new">{p("جديدة", "New")}</option></select></Field>
        <Field label={p("ناقل الحركة", "Transmission")}><select className="input" value={f.transmission} onChange={(e) => set("transmission", e.target.value)}><option value="">—</option><option value="automatic">{p("أوتوماتيك", "Automatic")}</option><option value="manual">{p("مانيوال", "Manual")}</option></select></Field>
        <Field label={p("الوقود", "Fuel")}><select className="input" value={f.fuelType} onChange={(e) => set("fuelType", e.target.value)}><option value="">—</option><option value="petrol">{p("بنزين", "Petrol")}</option><option value="diesel">{p("ديزل", "Diesel")}</option><option value="hybrid">{p("هايبرد", "Hybrid")}</option><option value="electric">{p("كهرباء", "Electric")}</option><option value="gas">{p("غاز", "Gas")}</option></select></Field>
        <Field label={p("سعة المحرك", "Engine capacity")}><input className="input" dir="ltr" placeholder="1600 cc" value={f.engineCapacity} onChange={(e) => set("engineCapacity", e.target.value)} /></Field>
        <Field label={p("نوع الهيكل", "Body style")}><input className="input" list="body-list" value={f.bodyStyle} onChange={(e) => set("bodyStyle", e.target.value)} /><datalist id="body-list">{["Sedan", "Hatchback", "SUV", "Crossover", "Pickup", "Van", "Coupe", "MPV", "Sport", "Cruiser", "Scooter", "Box Truck", "Flatbed", "Tipper", "Minibus"].map((b) => <option key={b} value={b} />)}</datalist></Field>
        <Field label={p("اللون الخارجي", "Exterior color")}><input className="input" value={f.exteriorColor} onChange={(e) => set("exteriorColor", e.target.value)} /></Field>
        <Field label={p("اللون الداخلي", "Interior color")}><input className="input" value={f.interiorColor} onChange={(e) => set("interiorColor", e.target.value)} /></Field>
        <Field label={p("المكان", "Location")}><input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <div />
        <Field label={p("المميزات بالعربية (سطر لكل ميزة)", "Features Arabic (one per line)")}><textarea className="input min-h-28" dir="rtl" value={f.featuresAr} onChange={(e) => set("featuresAr", e.target.value)} /></Field>
        <Field label={p("المميزات بالإنجليزية (سطر لكل ميزة)", "Features English (one per line)")}><textarea className="input min-h-28" dir="ltr" value={f.featuresEn} onChange={(e) => set("featuresEn", e.target.value)} /></Field>
      </Section>

      <section className="card p-5">
        <h2 className="mb-4 border-b border-gray-200 pb-2 font-bold">{p("الصور", "Images")}</h2>
        <MultiImageUploader value={f.images} onChange={(ids) => set("images", ids)} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 border-b border-gray-200 pb-2 font-bold">{p("الفئات (يمكن اختيار أكثر من فئة)", "Categories (multiple allowed)")}</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">{p("لا توجد فئات. أنشئ فئات من صفحة الفئات.", "No categories. Create some from the Categories page.")} <Link className="text-primary" href="/admin/categories">→</Link></p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = f.categoryIds.includes(c.id);
              return (
                <button type="button" key={c.id} aria-pressed={on} onClick={() => set("categoryIds", on ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id])} className={`chip ${on ? "chip-on" : "chip-off"}`}>
                  {c.icon ? <span>{c.icon}</span> : null}{pick(lang, c.nameAr, c.nameEn)}{!c.visible && " (hidden)"}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 border-b border-gray-200 pb-2 font-bold">{p("البدائل المقترحة", "Recommended alternatives")}</h2>
        <p className="mb-3 text-sm text-gray-600">
          {isRent
            ? p("عندما تُؤجَّر هذه المركبة تظهر بدلها البدائل المختارة هنا.", "When this vehicle is rented out, these picks appear in its place.")
            : p("عندما تُباع هذه المركبة تظهر بدلها البدائل المختارة هنا.", "When this vehicle is sold, these picks appear in its place.")}
        </p>
        <RecommendationPicker
          options={recOptions}
          value={f.recommendedIds}
          onChange={(ids) => set("recommendedIds", ids)}
          label={p("اختر من 1 إلى 6 مركبات", "Pick 1 to 6 vehicles")}
          hint={p("اتركها فارغة لاستخدام البدائل الافتراضية للموقع.", "Leave empty to use the site-wide defaults.")}
        />
        {f.soldAt && (
          <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {p("تاريخ البيع المسجل:", "Recorded sale date:")} <strong>{new Date(f.soldAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</strong>
          </p>
        )}
      </section>

      <Section title={p("النشر و SEO", "Publishing & SEO")}>
        <Field label={p("التوفر", "Availability")} hint={p("المركبات المباعة تختفي تلقائياً من الموقع", "Sold vehicles are hidden from the public site automatically")}>
          <select className="input" value={f.availability} onChange={(e) => set("availability", e.target.value as F["availability"])}>
            <option value="available">{p("متاحة", "Available")}</option><option value="reserved">{p("محجوزة", "Reserved")}</option><option value="sold">{p("مباعة", "Sold")}</option><option value="rented">{p("مؤجرة", "Rented")}</option><option value="unavailable">{p("غير متاحة", "Unavailable")}</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> <I.star className="inline h-3.5 w-3.5 text-amber-500" /> {p("مركبة مميزة في الرئيسية", "Featured on homepage")}</label>
        <Field label={p("عنوان SEO", "SEO title")}><input className="input" value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
        <Field label={p("وصف SEO", "SEO description")}><input className="input" value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
      </Section>

      {errors && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors}</p>}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <span className="me-auto text-sm text-gray-500">{p("الحالة الحالية:", "Current status:")} <strong>{f.status === "published" ? p("منشورة", "Published") : p("مسودة", "Draft")}</strong></span>
        <button type="button" className="btn-outline" disabled={pending} onClick={() => submit("draft")}>{pending ? "..." : p("حفظ كمسودة", "Save draft")}</button>
        <button type="button" className="btn-primary" disabled={pending} onClick={() => submit("published")}>{pending ? "..." : p("حفظ ونشر", "Save & publish")}</button>
      </div>
    </div>
  );
}
