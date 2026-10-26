"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteVehicleAction, quickUpdateVehicleAction } from "@/app/admin/actions";
import { ConfirmButton, useP, useToast } from "@/components/admin/ui";
import { I } from "@/components/Icon";

type Avail = "available" | "reserved" | "sold" | "rented" | "unavailable";
export default function VehicleRowActions({ id, slug, status, availability, featured }: { id: number; slug: string; status: string; availability: string; featured: boolean }) {
  const p = useP();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { show(p("تم", "Done")); router.refresh(); } else show(r.error ?? "error", "err");
    });
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {el}
      <Link href={`/admin/vehicles/${id}`} className="btn-outline !px-2 !py-1" title={p("تعديل", "Edit")}><I.pencil className="h-3.5 w-3.5" /></Link>
      <a href={`/vehicles/${slug}`} target="_blank" rel="noopener noreferrer" className="btn-outline !px-2 !py-1" title={p("معاينة", "Preview")}><I.eye className="h-3.5 w-3.5" /></a>
      <button disabled={pending} className="btn-outline !px-2 !py-1" onClick={() => run(() => quickUpdateVehicleAction(id, { status: status === "published" ? "draft" : "published" }))}>{status === "published" ? p("إلغاء النشر", "Unpublish") : p("نشر", "Publish")}</button>
      <button disabled={pending} className="btn-outline !px-2 !py-1" title={p("تمييز", "Featured")} onClick={() => run(() => quickUpdateVehicleAction(id, { featured: !featured }))}><I.star className={`h-3.5 w-3.5 ${featured ? "text-amber-500" : "text-gray-300"}`} /></button>
      <select disabled={pending} className="input !w-auto !px-2 !py-1 text-xs" value={availability} onChange={(e) => run(() => quickUpdateVehicleAction(id, { availability: e.target.value as Avail }))}>
        <option value="available">{p("متاحة", "Available")}</option><option value="reserved">{p("محجوزة", "Reserved")}</option><option value="sold">{p("مباعة", "Sold")}</option><option value="rented">{p("مؤجرة", "Rented")}</option><option value="unavailable">{p("غير متاحة", "Unavailable")}</option>
      </select>
      <ConfirmButton className="btn-danger !px-2 !py-1" onConfirm={() => run(() => deleteVehicleAction(id))}><I.trash className="h-3.5 w-3.5" /></ConfirmButton>
    </div>
  );
}
