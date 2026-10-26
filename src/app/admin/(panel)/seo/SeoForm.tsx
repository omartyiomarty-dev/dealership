"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SeoSettings } from "@/lib/settings";
import { saveSeoSettingsAction } from "@/app/admin/actions";
import { Field, ImagePicker, PageTitle, useP, useToast } from "@/components/admin/ui";

export default function SeoForm({ initial }: { initial: SeoSettings }) {
  const p = useP();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const set = <K extends keyof SeoSettings>(k: K, v: SeoSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const save = () => start(async () => { const r = await saveSeoSettingsAction(s); if (r.ok) { show(p("تم الحفظ", "Saved")); router.refresh(); } else show(r.error, "err"); });
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {el}
      <PageTitle actions={<button className="btn-primary" disabled={pending} onClick={save}>{p("حفظ", "Save")}</button>}>{p("إعدادات SEO", "SEO Settings")}</PageTitle>
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label={p("عنوان الموقع بالعربية", "Site title (Arabic)")}><input className="input" dir="rtl" value={s.siteTitleAr} onChange={(e) => set("siteTitleAr", e.target.value)} /></Field>
        <Field label={p("عنوان الموقع بالإنجليزية", "Site title (English)")}><input className="input" dir="ltr" value={s.siteTitleEn} onChange={(e) => set("siteTitleEn", e.target.value)} /></Field>
        <Field label={p("الوصف بالعربية", "Description (Arabic)")}><textarea className="input" dir="rtl" value={s.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></Field>
        <Field label={p("الوصف بالإنجليزية", "Description (English)")}><textarea className="input" dir="ltr" value={s.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></Field>
        <Field label={p("رابط الموقع النهائي", "Public site URL")} hint={p("مثال: https://example.com — يُستخدم في canonical و sitemap وروابط واتساب", "e.g. https://example.com — used for canonical URLs, sitemap and WhatsApp links")}><input className="input" dir="ltr" value={s.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} /></Field>
        <ImagePicker label={p("صورة المشاركة الافتراضية (OG)", "Default share image (OG)")} value={s.ogImageMediaId} onChange={(id) => set("ogImageMediaId", id)} />
      </section>
    </div>
  );
}
