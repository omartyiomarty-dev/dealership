"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/settings";
import { saveSiteSettingsAction } from "@/app/admin/actions";
import { Field, ImagePicker, PageTitle, useP, useToast } from "@/components/admin/ui";

/**
 * Theme presets. Every `primary` here has ≥4.5:1 contrast with white text
 * (WCAG AA) so buttons stay readable in every palette.
 */
const PRESETS = [
  { n: "Green", primary: "#137a39", primaryDark: "#0f6230", accent: "#b45309" },
  { n: "Emerald", primary: "#047857", primaryDark: "#065f46", accent: "#c2410c" },
  { n: "Teal", primary: "#0f766e", primaryDark: "#115e59", accent: "#a16207" },
  { n: "Blue", primary: "#1d4ed8", primaryDark: "#1e3a8a", accent: "#b45309" },
  { n: "Red", primary: "#b91c1c", primaryDark: "#991b1b", accent: "#111827" },
  { n: "Charcoal", primary: "#374151", primaryDark: "#1f2937", accent: "#b45309" },
];

export default function SiteSettingsForm({ initial, mode }: { initial: SiteSettings; mode: "info" | "appearance" }) {
  const p = useP();
  const router = useRouter();
  const [s, setS] = useState<SiteSettings>(initial);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const save = () => start(async () => { const r = await saveSiteSettingsAction(s); if (r.ok) { show(p("تم الحفظ", "Saved")); router.refresh(); } else show(r.error, "err"); });
  const links = s.socialLinks;
  const setLink = (i: number, patch: Partial<SiteSettings["socialLinks"][number]>) => set("socialLinks", links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {el}
      <PageTitle actions={<button className="btn-primary" disabled={pending} onClick={save}>{pending ? "..." : p("حفظ التغييرات", "Save changes")}</button>}>{mode === "info" ? p("بيانات المعرض", "Dealership Information") : p("المظهر والألوان", "Appearance")}</PageTitle>
      {mode === "info" ? (
        <>
          <section className="card grid gap-4 p-5 md:grid-cols-2">
            <Field label={p("اسم المعرض بالعربية", "Business name (Arabic)")}><input className="input" dir="rtl" value={s.nameAr} onChange={(e) => set("nameAr", e.target.value)} /></Field>
            <Field label={p("اسم المعرض بالإنجليزية", "Business name (English)")}><input className="input" dir="ltr" value={s.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></Field>
            <Field label={p("شعار قصير بالعربية", "Tagline (Arabic)")}><input className="input" dir="rtl" value={s.taglineAr} onChange={(e) => set("taglineAr", e.target.value)} /></Field>
            <Field label={p("شعار قصير بالإنجليزية", "Tagline (English)")}><input className="input" dir="ltr" value={s.taglineEn} onChange={(e) => set("taglineEn", e.target.value)} /></Field>
            <Field label={p("رقم الهاتف", "Phone")} hint={p("مثال: 01001234567", "e.g. 01001234567")}><input className="input" dir="ltr" value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label={p("رقم واتساب", "WhatsApp number")} hint={p("بدون صفر أو بالصفر المصري، سيُحوّل تلقائياً إلى 20", "Egyptian format; converted to +20 automatically")}><input className="input" dir="ltr" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
            <Field label={p("البريد الإلكتروني", "Email")}><input className="input" dir="ltr" value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label={p("رابط الخريطة (embed)", "Map embed URL")}><input className="input" dir="ltr" value={s.mapUrl} onChange={(e) => set("mapUrl", e.target.value)} /></Field>
            <Field label={p("رابط تقييمات جوجل", "Google reviews link")} hint={p("من خرائط جوجل: افتح صفحة المعرض ← مشاركة ← نسخ الرابط. يبدأ بـ https://", "In Google Maps: open your business → Share → Copy link. Must start with https://")}><input className="input" dir="ltr" placeholder="https://maps.app.goo.gl/..." value={s.googleReviewsUrl ?? ""} onChange={(e) => set("googleReviewsUrl", e.target.value)} /></Field>
            <Field label={p("العنوان بالعربية", "Address (Arabic)")}><textarea className="input" dir="rtl" value={s.addressAr} onChange={(e) => set("addressAr", e.target.value)} /></Field>
            <Field label={p("العنوان بالإنجليزية", "Address (English)")}><textarea className="input" dir="ltr" value={s.addressEn} onChange={(e) => set("addressEn", e.target.value)} /></Field>
            <Field label={p("مواعيد العمل بالعربية", "Opening hours (Arabic)")}><textarea className="input" dir="rtl" value={s.hoursAr} onChange={(e) => set("hoursAr", e.target.value)} /></Field>
            <Field label={p("مواعيد العمل بالإنجليزية", "Opening hours (English)")}><textarea className="input" dir="ltr" value={s.hoursEn} onChange={(e) => set("hoursEn", e.target.value)} /></Field>
            <Field label={p("نبذة عن المعرض بالعربية", "About (Arabic)")}><textarea className="input min-h-32" dir="rtl" value={s.aboutAr} onChange={(e) => set("aboutAr", e.target.value)} /></Field>
            <Field label={p("نبذة عن المعرض بالإنجليزية", "About (English)")}><textarea className="input min-h-32" dir="ltr" value={s.aboutEn} onChange={(e) => set("aboutEn", e.target.value)} /></Field>
            <Field label={p("نص الفوتر بالعربية", "Footer text (Arabic)")}><textarea className="input" dir="rtl" value={s.footerAr} onChange={(e) => set("footerAr", e.target.value)} /></Field>
            <Field label={p("نص الفوتر بالإنجليزية", "Footer text (English)")}><textarea className="input" dir="ltr" value={s.footerEn} onChange={(e) => set("footerEn", e.target.value)} /></Field>
          </section>
          <section className="card p-5">
            <h2 className="mb-1 font-bold">{p("روابط الصفحات والسوشيال ميديا", "Social & page links")}</h2>
            <p className="mb-3 text-xs text-gray-500">{p("تظهر في صفحة اتصل بنا والفوتر (فيسبوك، إنستجرام، تيك توك، يوتيوب، OLX، دوبيزل...)", "Shown on the Contact page and footer (Facebook, Instagram, TikTok, YouTube, OLX, Dubizzle...)")}</p>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input className="input !w-16 text-center" maxLength={4} placeholder="📘" value={l.icon ?? ""} onChange={(e) => setLink(i, { icon: e.target.value })} />
                  <input className="input flex-1 min-w-32" placeholder={p("الاسم (مثال: فيسبوك)", "Label (e.g. Facebook)")} value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                  <input className="input flex-[2] min-w-48" dir="ltr" placeholder="https://..." value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                  <button type="button" className="btn-ghost text-red-600" onClick={() => set("socialLinks", links.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-outline mt-3" onClick={() => set("socialLinks", [...links, { label: "", url: "", icon: "" }])}>+ {p("إضافة رابط", "Add link")}</button>
          </section>
        </>
      ) : (
        <>
          <section className="card grid gap-5 p-5 md:grid-cols-2">
            <ImagePicker label={p("الشعار (اللوجو)", "Logo")} value={s.logoMediaId} onChange={(id) => set("logoMediaId", id)} />
            <ImagePicker label={p("صورة الهيرو في الرئيسية", "Homepage hero image")} value={s.heroMediaId} onChange={(id) => set("heroMediaId", id)} />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-bold">{p("ألوان الموقع", "Theme colors")}</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRESETS.map((pr) => (
                <button key={pr.n} type="button" onClick={() => set("theme", { ...s.theme, primary: pr.primary, primaryDark: pr.primaryDark, accent: pr.accent })} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-primary">
                  <span className="h-5 w-5 rounded-full" style={{ background: pr.primary }} /><span className="h-5 w-5 rounded-full" style={{ background: pr.accent }} />{pr.n}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([["primary", p("اللون الأساسي", "Primary")], ["primaryDark", p("الأساسي الداكن", "Primary dark")], ["accent", p("لون مميز (الإيجار/التنبيه)", "Accent")], ["dark", p("لون النص الداكن", "Dark text")]] as const).map(([k, l]) => (
                <Field key={k} label={l}>
                  <div className="flex items-center gap-2"><input type="color" value={s.theme[k]} onChange={(e) => set("theme", { ...s.theme, [k]: e.target.value })} className="h-10 w-14 cursor-pointer rounded border" /><input className="input" dir="ltr" value={s.theme[k]} onChange={(e) => set("theme", { ...s.theme, [k]: e.target.value })} /></div>
                </Field>
              ))}
            </div>
            <div className="mt-4 flex gap-2"><span className="btn" style={{ background: s.theme.primary, color: "#fff" }}>{p("زر أساسي", "Primary button")}</span><span className="btn" style={{ background: s.theme.accent, color: "#fff" }}>{p("للإيجار", "For Rent")}</span><span className="badge" style={{ background: s.theme.dark, color: "#fff" }}>Aa</span></div>
          </section>
        </>
      )}
      <div className="flex justify-end"><button className="btn-primary" disabled={pending} onClick={save}>{pending ? "..." : p("حفظ التغييرات", "Save changes")}</button></div>
    </div>
  );
}
