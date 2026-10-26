"use client";
import { useMemo, useState } from "react";
import { useP } from "./ui";
import { mediaUrl } from "@/lib/media-url";

type Opt = { id: number; label: string; availability: string };

/** Multi-select for the alternatives shown on a sold/rented listing (max 6). */
export default function RecommendationPicker({
  options, value, onChange, label, hint,
}: { options: Opt[]; value: number[]; onChange: (ids: number[]) => void; label: string; hint: string }) {
  const p = useP();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options).slice(0, 60),
    [options, q],
  );
  const chosen = value.map((id) => options.find((o) => o.id === id)).filter(Boolean) as Opt[];

  return (
    <div>
      <label className="label">{label}</label>
      <p className="mb-2 text-xs text-gray-500">{hint}</p>

      {chosen.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {chosen.map((c) => (
            <li key={c.id} className="chip chip-on">
              {c.label}
              <button type="button" aria-label="remove" className="text-xs" onClick={() => onChange(value.filter((x) => x !== c.id))}>×</button>
            </li>
          ))}
        </ul>
      )}

      <input className="input mb-2" placeholder={p("ابحث بالاسم أو رقم المركبة…", "Search by name or stock no…")} value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">{p("لا نتائج", "No results")}</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((o) => {
              const on = value.includes(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={!on && value.length >= 6}
                    onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition disabled:opacity-40 ${on ? "bg-primary/10" : "hover:bg-gray-50"}`}
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.availability !== "available" && (
                      <span className="badge bg-gray-200 text-gray-700">{o.availability === "sold" ? p("مباعة", "Sold") : o.availability === "rented" ? p("مؤجرة", "Rented") : o.availability}</span>
                    )}
                    {on && <span className="text-primary">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{value.length}/6</p>
    </div>
  );
}
