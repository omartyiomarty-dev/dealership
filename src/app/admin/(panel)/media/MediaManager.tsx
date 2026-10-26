"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMediaAction, updateMediaAltAction } from "@/app/admin/actions";
import { PageTitle, uploadFiles, useP, useToast } from "@/components/admin/ui";
import { mediaUrl } from "@/lib/media-url";
import { I } from "@/components/Icon";

type Item = { id: number; filename: string; mimeType: string; size: number; width: number | null; height: number | null; alt: string | null; createdAt: Date };

export default function MediaManager({ items }: { items: Item[] }) {
  const p = useP();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<{ id: number; usage: string } | null>(null);
  const { show, el } = useToast();
  const del = (id: number, force: boolean) =>
    start(async () => {
      const r = await deleteMediaAction(id, force);
      if (r.ok) { show(p("تم الحذف", "Deleted")); setConfirm(null); router.refresh(); }
      else if (r.error.startsWith("in_use")) setConfirm({ id, usage: r.error.replace("in_use: ", "") });
      else show(r.error, "err");
    });
  return (
    <div>
      {el}
      <PageTitle actions={
        <label className="btn-primary cursor-pointer">{busy ? p("جاري الرفع...", "Uploading...") : `📷 ${p("رفع صور", "Upload images")}`}
          <input type="file" multiple accept="image/*" className="hidden" disabled={busy} onChange={async (e) => { if (!e.target.files?.length) return; setBusy(true); try { await uploadFiles(e.target.files); show(p("تم الرفع", "Uploaded")); router.refresh(); } catch (ex) { show((ex as Error).message, "err"); } finally { setBusy(false); e.target.value = ""; } }} />
        </label>
      }>{p("مكتبة الصور", "Media Library")} <span className="text-base font-normal text-gray-500">({items.length})</span></PageTitle>
      <p className="mb-4 text-xs text-gray-500">{p("يتم ضغط الصور تلقائياً إلى WebP بعرض أقصى 1600px لسرعة التحميل. الحد الأقصى 8MB للصورة.", "Images are automatically optimized to WebP (max 1600px) for fast loading. Max 8MB per file.")}</p>
      {items.length === 0 ? <div className="card p-10 text-center text-gray-500">{p("لا توجد صور بعد", "No images yet")}</div> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(m.id)!} alt={m.alt ?? m.filename} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="p-2 text-xs text-gray-600">
                <div className="truncate" title={m.filename}>{m.filename}</div>
                <div>{m.width}×{m.height} · {(m.size / 1024).toFixed(0)}KB</div>
                <input className="input mt-1 !py-1 text-xs" placeholder={p("نص بديل (alt)", "Alt text")} defaultValue={m.alt ?? ""} onBlur={(e) => { if (e.target.value !== (m.alt ?? "")) start(async () => { await updateMediaAltAction(m.id, e.target.value); }); }} />
                <div className="mt-1 flex justify-between">
                  <button className="text-primary" onClick={() => navigator.clipboard.writeText(location.origin + mediaUrl(m.id))}>🔗 {p("نسخ", "Copy")}</button>
                  <button className="text-red-600" disabled={pending} onClick={() => del(m.id, false)}><I.trash className="inline h-3.5 w-3.5" /> {p("حذف", "Delete")}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog">
          <div className="card w-full max-w-md p-5">
            <h3 className="font-bold text-red-700">⚠️ {p("هذه الصورة مستخدمة", "This image is in use")}</h3>
            <p className="mt-2 text-sm text-gray-700">{p("مستخدمة في:", "Used in:")} <code className="text-xs">{confirm.usage}</code></p>
            <p className="mt-1 text-sm text-gray-600">{p("حذفها سيزيلها من هذه الأماكن. هل تريد المتابعة؟", "Deleting will remove it from those places. Continue?")}</p>
            <div className="mt-4 flex justify-end gap-2"><button className="btn-outline" onClick={() => setConfirm(null)}>{p("إلغاء", "Cancel")}</button><button className="btn-danger" onClick={() => del(confirm.id, true)}>{p("حذف على أي حال", "Delete anyway")}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
