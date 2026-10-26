"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Brand, VehicleModel } from "@/db/schema";
import { saveBrandAction, deleteBrandAction, saveModelAction, deleteModelAction } from "@/app/admin/actions";
import { ConfirmButton, PageTitle, useP, useToast } from "@/components/admin/ui";
import { I } from "@/components/Icon";

export default function BrandsManager({ brands, models }: { brands: Brand[]; models: VehicleModel[] }) {
  const p = useP();
  const router = useRouter();
  const [nb, setNb] = useState({ ar: "", en: "" });
  const [nm, setNm] = useState<Record<number, { ar: string; en: string }>>({});
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => { const r = await fn(); if (r.ok) { after?.(); router.refresh(); } else show(r.error ?? "error", "err"); });
  return (
    <div>
      {el}
      <PageTitle>{p("الماركات والموديلات", "Brands & Models")}</PageTitle>
      <p className="mb-4 text-sm text-gray-600">{p("تُستخدم كاقتراحات عند إضافة سيارة (يمكن كتابة أي ماركة يدوياً أيضاً).", "Used as suggestions when adding a vehicle (any make can also be typed manually).")}</p>
      <form className="card mb-4 flex flex-wrap gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (!nb.ar || !nb.en) return; run(() => saveBrandAction(null, nb.ar, nb.en), () => setNb({ ar: "", en: "" })); }}>
        <input className="input flex-1" dir="rtl" placeholder={p("الماركة بالعربية", "Brand (Arabic)")} value={nb.ar} onChange={(e) => setNb({ ...nb, ar: e.target.value })} />
        <input className="input flex-1" dir="ltr" placeholder="Brand (English)" value={nb.en} onChange={(e) => setNb({ ...nb, en: e.target.value })} />
        <button className="btn-primary" disabled={pending}><I.plus className="h-4 w-4" /> {p("إضافة ماركة", "Add brand")}</button>
      </form>
      {brands.length === 0 && <div className="card p-8 text-center text-gray-500">{p("لا توجد ماركات بعد", "No brands yet")}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {brands.map((b) => (
          <div key={b.id} className="card p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">{b.nameAr} / {b.nameEn}</h3><ConfirmButton className="btn-danger !py-1 !px-2" onConfirm={() => run(() => deleteBrandAction(b.id))}><I.trash className="h-3.5 w-3.5" /></ConfirmButton></div>
            <ul className="mt-2 flex flex-wrap gap-1">
              {models.filter((m) => m.brandId === b.id).map((m) => <li key={m.id} className="chip chip-off cursor-default">{m.nameAr} / {m.nameEn} <button className="text-red-600" onClick={() => run(() => deleteModelAction(m.id))} aria-label="delete">×</button></li>)}
            </ul>
            <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); const v = nm[b.id]; if (!v?.ar || !v?.en) return; run(() => saveModelAction(b.id, v.ar, v.en), () => setNm({ ...nm, [b.id]: { ar: "", en: "" } })); }}>
              <input className="input !py-1" dir="rtl" placeholder={p("موديل عربي", "Model AR")} value={nm[b.id]?.ar ?? ""} onChange={(e) => setNm({ ...nm, [b.id]: { ar: e.target.value, en: nm[b.id]?.en ?? "" } })} />
              <input className="input !py-1" dir="ltr" placeholder="Model EN" value={nm[b.id]?.en ?? ""} onChange={(e) => setNm({ ...nm, [b.id]: { ar: nm[b.id]?.ar ?? "", en: e.target.value } })} />
              <button className="btn-outline !py-1">+</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
