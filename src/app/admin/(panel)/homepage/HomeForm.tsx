"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { HomeSettings } from "@/lib/settings";
import { saveHomeSettingsAction } from "@/app/admin/actions";
import { Field, PageTitle, useP, useToast } from "@/components/admin/ui";

export default function HomeForm({ initial }: { initial: HomeSettings }) {
  const p = useP();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const set = <K extends keyof HomeSettings>(k: K, v: HomeSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const names: Record<string, string> = { hero: p("الهيرو (العنوان الرئيسي)", "Hero"), choose: p("بانر اختار معايا", "Help Me Choose banner"), featured: p("سيارات مميزة", "Featured vehicles"), categories: p("الفئات", "Categories"), recent: p("أحدث السيارات", "Recent vehicles"), services: p("الخدمات", "Services"), about: p("من نحن", "About"), contact: p("اتصل بنا", "Contact") };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= s.sections.length) return; const arr = [...s.sections]; [arr[i], arr[j]] = [arr[j], arr[i]]; set("sections", arr); };
  const save = () => start(async () => { const r = await saveHomeSettingsAction(s); if (r.ok) { show(p("تم الحفظ", "Saved")); router.refresh(); } else show(r.error, "err"); });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {el}
      <PageTitle actions={<button className="btn-primary" disabled={pending} onClick={save}>{pending ? "..." : p("حفظ", "Save")}</button>}>{p("إدارة الصفحة الرئيسية", "Homepage Management")}</PageTitle>
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label={p("عنوان الهيرو بالعربية", "Hero title (Arabic)")}><input className="input" dir="rtl" value={s.heroTitleAr} onChange={(e) => set("heroTitleAr", e.target.value)} /></Field>
        <Field label={p("عنوان الهيرو بالإنجليزية", "Hero title (English)")}><input className="input" dir="ltr" value={s.heroTitleEn} onChange={(e) => set("heroTitleEn", e.target.value)} /></Field>
        <Field label={p("وصف الهيرو بالعربية", "Hero text (Arabic)")}><textarea className="input" dir="rtl" value={s.heroTextAr} onChange={(e) => set("heroTextAr", e.target.value)} /></Field>
        <Field label={p("وصف الهيرو بالإنجليزية", "Hero text (English)")}><textarea className="input" dir="ltr" value={s.heroTextEn} onChange={(e) => set("heroTextEn", e.target.value)} /></Field>
        <Field label={p("عنوان بانر اختار معايا (عربي)", "Choose banner title (Arabic)")}><input className="input" dir="rtl" value={s.chooseTitleAr} onChange={(e) => set("chooseTitleAr", e.target.value)} /></Field>
        <Field label={p("عنوان بانر اختار معايا (إنجليزي)", "Choose banner title (English)")}><input className="input" dir="ltr" value={s.chooseTitleEn} onChange={(e) => set("chooseTitleEn", e.target.value)} /></Field>
        <Field label={p("نص بانر اختار معايا (عربي)", "Choose banner text (Arabic)")}><textarea className="input" dir="rtl" value={s.chooseTextAr} onChange={(e) => set("chooseTextAr", e.target.value)} /></Field>
        <Field label={p("نص بانر اختار معايا (إنجليزي)", "Choose banner text (English)")}><textarea className="input" dir="ltr" value={s.chooseTextEn} onChange={(e) => set("chooseTextEn", e.target.value)} /></Field>
        <Field label={p("عدد السيارات المميزة", "Featured vehicles count")}><input className="input" type="number" min={1} max={24} value={s.featuredLimit} onChange={(e) => set("featuredLimit", Number(e.target.value))} /></Field>
        <Field label={p("عدد أحدث السيارات", "Recent vehicles count")}><input className="input" type="number" min={1} max={24} value={s.recentLimit} onChange={(e) => set("recentLimit", Number(e.target.value))} /></Field>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 font-bold">{p("ترتيب الأقسام وإظهارها", "Section order & visibility")}</h2>
        <p className="mb-3 text-xs text-gray-500">{p("صورة الهيرو واللوجو من صفحة «المظهر». المركبات المميزة تُحدد من صفحة كل مركبة.", "Hero image & logo are in Appearance. Featured vehicles are set per vehicle.")} <Link href="/admin/vehicles" className="text-primary">←</Link></p>
        <ul className="divide-y">
          {s.sections.map((sec, i) => (
            <li key={sec.key} className="flex items-center gap-3 py-2">
              <div className="flex flex-col"><button className="text-xs text-gray-400 hover:text-primary" onClick={() => move(i, -1)}>▲</button><button className="text-xs text-gray-400 hover:text-primary" onClick={() => move(i, 1)}>▼</button></div>
              <span className="flex-1">{names[sec.key] ?? sec.key}</span>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sec.visible} onChange={(e) => set("sections", s.sections.map((x) => (x.key === sec.key ? { ...x, visible: e.target.checked } : x)))} /> {p("ظاهر", "Visible")}</label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
