"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/db/schema";
import { saveCategoryAction, deleteCategoryAction, reorderCategoriesAction, type CategoryInput } from "@/app/admin/actions";
import { ConfirmButton, Field, ImagePicker, PageTitle, useP, useToast } from "@/components/admin/ui";
import { useT } from "@/components/LangProvider";
import { pick } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media-url";
import { I } from "@/components/Icon";

type Item = Category & { count: number };
const blank: CategoryInput = { nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", icon: "", iconMediaId: null, visible: true, showOnHome: true };
const ICONS = ["🚗", "🚙", "🏎", "🚕", "🏍", "🛵", "🚚", "🛻", "🚐", "🚌", "🛺", "🚜", "🔑", "💰", "👨‍👩‍👧", "⚙️", "⛽", "🔋", "🆕", "📅", "⭐", "💎", "🏷", "🛣", "🏙", "🌿", "🧳", "🏁"];

export default function CategoriesManager({ items }: { items: Item[] }) {
  const p = useP();
  const { lang } = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: number | null; data: CategoryInput } | null>(null);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => { const r = await fn(); if (r.ok) { show(p("تم الحفظ", "Saved")); after?.(); router.refresh(); } else show(r.error ?? "error", "err"); });
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= items.length) return;
    const ids = items.map((x) => x.id); [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorderCategoriesAction(ids));
  };
  return (
    <div>
      {el}
      <PageTitle actions={<button className="btn-primary" onClick={() => setEditing({ id: null, data: { ...blank } })}><I.plus className="h-4 w-4" /> {p("فئة جديدة", "New category")}</button>}>{p("الفئات", "Categories")}</PageTitle>
      <p className="mb-4 text-sm text-gray-600">{p("الفئات التي تنشئها هنا (مع أيقوناتها) هي فقط ما يظهر في صفحة «اختار معايا» والرئيسية. يمكن للمركبة الواحدة الانتماء لعدة فئات.", "Only the categories you create here (with their icons) appear on the “Help Me Choose” page and homepage. One vehicle can belong to many categories.")}</p>
      {items.length === 0 ? <div className="card p-10 text-center text-gray-500">{p("لا توجد فئات بعد", "No categories yet")}</div> : (
        <ul className="card divide-y">
          {items.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex flex-col"><button className="text-xs text-gray-400 hover:text-primary" onClick={() => move(i, -1)} aria-label="up">▲</button><button className="text-xs text-gray-400 hover:text-primary" onClick={() => move(i, 1)} aria-label="down">▼</button></div>
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-gray-100 text-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.iconMediaId ? <img src={mediaUrl(c.iconMediaId)!} alt="" className="h-full w-full object-cover" /> : c.icon || <I.tag className="h-5 w-5 text-gray-400" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.nameAr} <span className="text-gray-400">/</span> {c.nameEn}</div>
                <div className="text-xs text-gray-500">{c.count} {p("مركبة", "vehicles")} {!c.visible && <span className="badge bg-gray-200">{p("مخفية", "hidden")}</span>} {!c.showOnHome && <span className="badge bg-gray-100">{p("ليست في الرئيسية", "not on home")}</span>}</div>
              </div>
              <button className="btn-outline !py-1" title={p("تعديل", "Edit")} onClick={() => setEditing({ id: c.id, data: { nameAr: c.nameAr, nameEn: c.nameEn, descriptionAr: c.descriptionAr ?? "", descriptionEn: c.descriptionEn ?? "", icon: c.icon ?? "", iconMediaId: c.iconMediaId, visible: c.visible, showOnHome: c.showOnHome } })}><I.pencil className="h-3.5 w-3.5" /> {p("تعديل", "Edit")}</button>
              <ConfirmButton className="btn-danger !py-1" message={p(`حذف الفئة «${pick(lang, c.nameAr, c.nameEn)}»؟ لن يتم حذف السيارات المرتبطة بها.`, `Delete category “${pick(lang, c.nameAr, c.nameEn)}”? Assigned vehicles will NOT be deleted.`)} onConfirm={() => run(() => deleteCategoryAction(c.id))}><I.trash className="h-3.5 w-3.5" /></ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
          <form className="card w-full max-w-lg space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (!editing.data.nameAr.trim() || !editing.data.nameEn.trim()) { show(p("الاسم بالعربية والإنجليزية مطلوب", "Both names are required"), "err"); return; } run(() => saveCategoryAction(editing.id, editing.data), () => setEditing(null)); }}>
            <h2 className="text-lg font-bold">{editing.id ? p("تعديل فئة", "Edit category") : p("فئة جديدة", "New category")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={p("الاسم بالعربية *", "Arabic name *")}><input className="input" dir="rtl" value={editing.data.nameAr} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nameAr: e.target.value } })} /></Field>
              <Field label={p("الاسم بالإنجليزية *", "English name *")}><input className="input" dir="ltr" value={editing.data.nameEn} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nameEn: e.target.value } })} /></Field>
              <Field label={p("الوصف بالعربية", "Arabic description")}><textarea className="input" dir="rtl" value={editing.data.descriptionAr ?? ""} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, descriptionAr: e.target.value } })} /></Field>
              <Field label={p("الوصف بالإنجليزية", "English description")}><textarea className="input" dir="ltr" value={editing.data.descriptionEn ?? ""} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, descriptionEn: e.target.value } })} /></Field>
            </div>
            <Field label={p("الأيقونة (إيموجي)", "Icon (emoji)")}>
              <div className="flex flex-wrap gap-1">
                {ICONS.map((ic) => <button type="button" key={ic} onClick={() => setEditing({ ...editing, data: { ...editing.data, icon: ic } })} className={`grid h-9 w-9 place-items-center rounded-lg border text-lg ${editing.data.icon === ic ? "border-primary bg-primary/10" : "border-gray-200"}`}>{ic}</button>)}
                <input className="input !w-24" maxLength={4} placeholder="✍️" value={editing.data.icon ?? ""} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, icon: e.target.value } })} />
              </div>
            </Field>
            <ImagePicker label={p("أو صورة أيقونة مخصصة", "Or a custom icon image")} value={editing.data.iconMediaId ?? null} onChange={(id) => setEditing({ ...editing, data: { ...editing.data, iconMediaId: id } })} />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.visible} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, visible: e.target.checked } })} /> {p("ظاهرة للزوار", "Visible to visitors")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.showOnHome} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, showOnHome: e.target.checked } })} /> {p("تظهر في الرئيسية", "Show on homepage")}</label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setEditing(null)}>{p("إلغاء", "Cancel")}</button><button className="btn-primary" disabled={pending}>{p("حفظ", "Save")}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
