"use client";
import { useT } from "@/components/LangProvider";
import { saveGlobalRecommendationsAction } from "@/app/admin/actions";
import { useState } from "react";

export default function SalesActions() {
  const { t } = useT();
  const [ids, setIds] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="card mt-6 flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = ids.split(/[,\s]+/).map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0).slice(0, 6);
        const r = await saveGlobalRecommendationsAction(parsed);
        setMsg(r.ok ? t("saved") : r.error);
      }}
    >
      <div className="min-w-64 flex-1">
        <label className="label">{t("global_recommendations")}</label>
        <p className="mb-2 text-xs text-gray-500">{t("global_recommendations_hint")}</p>
        <input className="input" dir="ltr" placeholder="12, 34, 56" value={ids} onChange={(e) => setIds(e.target.value)} />
      </div>
      <button className="btn-primary">{t("save")}</button>
      {msg && <span className="text-sm text-primary">{msg}</span>}
    </form>
  );
}
