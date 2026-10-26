"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PolicySettings } from "@/lib/settings";
import { savePoliciesAction } from "@/app/admin/actions";
import { Field, PageTitle, useP, useToast } from "@/components/admin/ui";

export default function PoliciesForm({ initial }: { initial: PolicySettings }) {
  const p = useP();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const set = <K extends keyof PolicySettings>(k: K, v: string) => setS((x) => ({ ...x, [k]: v }));
  const save = () => start(async () => { const r = await savePoliciesAction(s); if (r.ok) { show(p("تم الحفظ", "Saved")); router.refresh(); } else show(r.error, "err"); });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {el}
      <PageTitle actions={<button className="btn-primary" disabled={pending} onClick={save}>{p("حفظ", "Save")}</button>}>{p("سياسة الخصوصية والشروط", "Privacy & Terms")}</PageTitle>
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label={p("سياسة الخصوصية بالعربية", "Privacy policy (Arabic)")}><textarea className="input min-h-64" dir="rtl" value={s.privacyAr} onChange={(e) => set("privacyAr", e.target.value)} /></Field>
        <Field label={p("سياسة الخصوصية بالإنجليزية", "Privacy policy (English)")}><textarea className="input min-h-64" dir="ltr" value={s.privacyEn} onChange={(e) => set("privacyEn", e.target.value)} /></Field>
        <Field label={p("الشروط والأحكام بالعربية", "Terms (Arabic)")}><textarea className="input min-h-64" dir="rtl" value={s.termsAr} onChange={(e) => set("termsAr", e.target.value)} /></Field>
        <Field label={p("الشروط والأحكام بالإنجليزية", "Terms (English)")}><textarea className="input min-h-64" dir="ltr" value={s.termsEn} onChange={(e) => set("termsEn", e.target.value)} /></Field>
      </section>
    </div>
  );
}
