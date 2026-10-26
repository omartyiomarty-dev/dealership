"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useT } from "@/components/LangProvider";
import { pick } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media-url";
import { I } from "@/components/Icon";

export function useP() {
  const { lang } = useT();
  return (ar: string, en: string) => pick(lang, ar, en);
}

export function Toast({ msg, type, onDone }: { msg: string; type: "ok" | "err"; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div role="status" className={`fixed bottom-5 start-5 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg animate-fade-in ${type === "ok" ? "bg-primary" : "bg-red-600"}`}>
      {msg}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err"; key: number } | null>(null);
  const done = useCallback(() => setToast(null), []);
  const show = useCallback((msg: string, type: "ok" | "err" = "ok") => setToast({ msg, type, key: Date.now() }), []);
  const el = toast ? <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={done} /> : null;
  return { show, el };
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-gray-900">{children}</h1>
      {actions}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function ConfirmButton({ onConfirm, children, className = "btn-danger", message }: { onConfirm: () => void; children: ReactNode; className?: string; message?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-sm p-6">
            <p className="font-semibold text-gray-900">{message ?? t("confirm_delete")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>{t("cancel")}</button>
              <button type="button" className="btn-danger" onClick={() => { setOpen(false); onConfirm(); }}>{t("yes_delete")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Shrinks large photos in the browser before upload.
 * Phone photos are often 5–10 MB, but serverless hosts cap a request body at
 * ~4.5 MB (Vercel) / ~6 MB (Netlify). Images are re-encoded to JPEG at most
 * 2000 px wide (usually < 1 MB); the server then converts them to WebP anyway,
 * so no visible quality is lost. GIFs (may be animated) and small files are
 * sent untouched. If the browser cannot decode the file it is sent as-is and
 * the server-side validation decides.
 */
const MAX_DIM = 2000;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;
async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= SHRINK_ABOVE) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Uploads images ONE PER REQUEST (after shrinking), so a batch of phone photos
 * never exceeds a host's request-size limit and one bad file does not fail
 * the whole batch silently.
 */
export async function uploadFiles(files: FileList | File[]): Promise<{ id: number }[]> {
  const list = Array.from(files);
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  for (const f of list) {
    if (!allowed.includes(f.type)) throw new Error("نوع الملف غير مدعوم / Unsupported file type: " + f.name);
    if (f.size > 25 * 1024 * 1024) throw new Error("الصورة أكبر من 25MB / Image exceeds 25MB: " + f.name);
  }
  if (list.length > 20) throw new Error("الحد الأقصى 20 صورة في المرة / Max 20 images per upload");

  const uploaded: { id: number }[] = [];
  for (const original of list) {
    const f = await shrinkImage(original);
    if (f.size > 8 * 1024 * 1024) throw new Error("الصورة كبيرة جداً بعد الضغط / Image still too large: " + original.name);
    const fd = new FormData();
    fd.append("files", f);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      if (res.status === 413) throw new Error("الصورة أكبر من حد الاستضافة أو المساحة ممتلئة / Too large for host or storage full: " + original.name);
      throw new Error((j.error || "upload_failed") + " — " + original.name);
    }
    const j = await res.json();
    uploaded.push(...j.files);
  }
  return uploaded;
}

/** Single image picker (upload new or choose from library) */
export function ImagePicker({ value, onChange, label }: { value: number | null; onChange: (id: number | null) => void; label: string }) {
  const p = useP();
  const [busy, setBusy] = useState(false);
  const [lib, setLib] = useState<{ id: number; filename: string }[] | null>(null);
  const [err, setErr] = useState("");
  async function openLib() {
    const r = await fetch("/api/admin/media");
    if (r.ok) setLib((await r.json()).items);
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-20 w-28 place-items-center overflow-hidden rounded-lg border border-gray-300 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={mediaUrl(value)!} alt="" className="h-full w-full object-cover" /> : <span className="text-gray-400">—</span>}
        </div>
        <label className="btn-outline cursor-pointer">
          {busy ? "..." : p("رفع صورة", "Upload")}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={async (e) => {
            if (!e.target.files?.length) return;
            setBusy(true); setErr("");
            try { const [f] = await uploadFiles(e.target.files); onChange(f.id); } catch (ex) { setErr(String((ex as Error).message)); } finally { setBusy(false); e.target.value = ""; }
          }} />
        </label>
        <button type="button" className="btn-outline" onClick={openLib}>{p("من المكتبة", "From library")}</button>
        {value && <button type="button" className="btn-ghost text-red-600" onClick={() => onChange(null)} aria-label="Clear">×</button>}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      {lib && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog">
          <div className="card max-h-[80vh] w-full max-w-3xl overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{p("مكتبة الصور", "Media Library")}</h3><button type="button" className="btn-ghost" onClick={() => setLib(null)} aria-label="Close">×</button></div>
            {lib.length === 0 ? <p className="text-sm text-gray-500">{p("لا توجد صور بعد", "No images yet")}</p> : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {lib.map((m) => (
                  <button key={m.id} type="button" onClick={() => { onChange(m.id); setLib(null); }} className="aspect-square overflow-hidden rounded-lg border hover:border-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(m.id)!} alt={m.filename} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Multi-image uploader with reorder; first image = main image */
export function MultiImageUploader({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const p = useP();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const arr = [...value];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-primary cursor-pointer">
          {busy ? p("جاري الرفع...", "Uploading...") : `📷 ${p("رفع صور", "Upload images")}`}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={async (e) => {
            if (!e.target.files?.length) return;
            setBusy(true); setErr("");
            try { const files = await uploadFiles(e.target.files); onChange([...value, ...files.map((f) => f.id)]); } catch (ex) { setErr(String((ex as Error).message)); } finally { setBusy(false); e.target.value = ""; }
          }} />
        </label>
        <span className="text-xs text-gray-500">{p("JPG/PNG/WebP حتى 8MB — الصورة الأولى هي الرئيسية", "JPG/PNG/WebP up to 8MB — first image is the main image")}</span>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      {value.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {value.map((id, i) => (
            <li key={id} className={`relative overflow-hidden rounded-lg border-2 ${i === 0 ? "border-primary" : "border-gray-200"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(id)!} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && <span className="absolute start-1 top-1 rounded bg-primary px-1.5 text-xs text-white">{p("رئيسية", "Main")}</span>}
              <div className="flex justify-between bg-white p-1 text-xs">
                <button type="button" onClick={() => move(i, -1)} className="px-1 hover:text-primary" aria-label="Move up"><I.arrowLeft className="h-3 w-3 rotate-180" /></button>
                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="px-1 text-red-600" aria-label="Remove">×</button>
                {i !== 0 && <button type="button" onClick={() => onChange([id, ...value.filter((x) => x !== id)])} className="px-1 hover:text-primary" title={p("اجعلها رئيسية", "Make main")}><I.star className="inline h-3 w-3 text-amber-400" /></button>}
                <button type="button" onClick={() => move(i, 1)} className="px-1 hover:text-primary" aria-label="Move down"><I.arrowLeft className="h-3 w-3" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
