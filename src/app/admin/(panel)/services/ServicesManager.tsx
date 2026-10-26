"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/db/schema";
import { saveServiceAction, deleteServiceAction, reorderServicesAction, type ServiceInput } from "@/app/admin/actions";
import { ConfirmButton, Field, PageTitle, useP, useToast } from "@/components/admin/ui";
import { I } from "@/components/Icon";

const blank: ServiceInput = { titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", icon: "", published: true };

export default function ServicesManager({ items }: { items: Service[] }) {
  const p = useP();
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: number | null; data: ServiceInput } | null>(null);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => { const r = await fn(); if (r.ok) { show(p("تم الحفظ", "Saved")); after?.(); router.refresh(); } else show(r.error ?? "error", "err"); });
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const ids = items.map((x) => x.id); [ids[i], ids[j]] = [ids[j], ids[i]]; run(() => reorderServicesAction(ids)); };
  const up = (patch: Partial<ServiceInput>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });
  return (
    <div>
      {el}
      <PageTitle actions={<button className="btn-primary" onClick={() => setEditing({ id: null, data: { ...blank } })}><I.plus className="h-4 w-4" /> {p("خدمة جديدة", "New service")}</button>}>{p("الخدمات", "Services")}</PageTitle>
      {items.length === 0 ? <div className="card p-10 text-center text-gray-500">{p("لا توجد خدمات بعد", "No services yet")}</div> : (
        <ul className="card divide-y">
          {items.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex flex-col"><button className="text-xs text-gray-400 hover:text-primary" onClick={() => move(i, -1)}>▲</button><button className="text-xs text-gray-400 hover:text-primary" onClick={() => move(i, 1)}>▼</button></div>
              <span className="text-2xl">{s.icon || <I.wrench className="h-6 w-6 text-gray-400" />}</span>
              <div className="min-w-0 flex-1"><div className="font-semibold">{s.titleAr} / {s.titleEn}</div><div className="text-xs text-gray-500">{s.published ? p("منشورة", "Published") : p("غير منشورة", "Unpublished")}</div></div>
              <button className="btn-outline !py-1" onClick={() => run(() => saveServiceAction(s.id, { titleAr: s.titleAr, titleEn: s.titleEn, descriptionAr: s.descriptionAr, descriptionEn: s.descriptionEn, icon: s.icon, published: !s.published }))}>{s.published ? p("إلغاء النشر", "Unpublish") : p("نشر", "Publish")}</button>
              <button className="btn-outline !py-1" title={p("تعديل", "Edit")} onClick={() => setEditing({ id: s.id, data: { titleAr: s.titleAr, titleEn: s.titleEn, descriptionAr: s.descriptionAr ?? "", descriptionEn: s.descriptionEn ?? "", icon: s.icon ?? "", published: s.published } })}><I.pencil className="h-3.5 w-3.5" /></button>
              <ConfirmButton className="btn-danger !py-1" onConfirm={() => run(() => deleteServiceAction(s.id))}><I.trash className="h-3.5 w-3.5" /></ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" role="dialog">
          <form className="card w-full max-w-lg space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); if (!editing.data.titleAr.trim() || !editing.data.titleEn.trim()) { show(p("العنوان مطلوب بالعربية والإنجليزية", "Both titles required"), "err"); return; } run(() => saveServiceAction(editing.id, editing.data), () => setEditing(null)); }}>
            <h2 className="text-lg font-bold">{editing.id ? p("تعديل خدمة", "Edit service") : p("خدمة جديدة", "New service")}</h2>
            <Field label={p("أيقونة (إيموجي)", "Icon (emoji)")}><input className="input !w-24" maxLength={4} value={editing.data.icon ?? ""} onChange={(e) => up({ icon: e.target.value })} /></Field>
            <Field label={p("العنوان بالعربية *", "Arabic title *")}><input className="input" dir="rtl" value={editing.data.titleAr} onChange={(e) => up({ titleAr: e.target.value })} /></Field>
            <Field label={p("العنوان بالإنجليزية *", "English title *")}><input className="input" dir="ltr" value={editing.data.titleEn} onChange={(e) => up({ titleEn: e.target.value })} /></Field>
            <Field label={p("الوصف بالعربية", "Arabic description")}><textarea className="input" dir="rtl" value={editing.data.descriptionAr ?? ""} onChange={(e) => up({ descriptionAr: e.target.value })} /></Field>
            <Field label={p("الوصف بالإنجليزية", "English description")}><textarea className="input" dir="ltr" value={editing.data.descriptionEn ?? ""} onChange={(e) => up({ descriptionEn: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.data.published} onChange={(e) => up({ published: e.target.checked })} /> {p("منشورة", "Published")}</label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setEditing(null)}>{p("إلغاء", "Cancel")}</button><button className="btn-primary" disabled={pending}>{p("حفظ", "Save")}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
