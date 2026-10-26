"use client";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction, updateProfileAction, createAdminAction, deleteAdminAction, resetAdminPasswordAction } from "@/app/admin/actions";
import type { SessionAdmin } from "@/lib/auth";
import { ConfirmButton, Field, PageTitle, useP, useToast } from "@/components/admin/ui";
import { I } from "@/components/Icon";

type Row = { id: number; name: string; email: string; isPrimary: boolean; createdAt: Date };

export default function AccountForms({ me, admins }: { me: SessionAdmin; admins: Row[] }) {
  const p = useP();
  const router = useRouter();
  const [prof, profAction, profPending] = useActionState(updateProfileAction, null);
  const [pw, pwAction, pwPending] = useActionState(changePasswordAction, null);
  const [cr, crAction, crPending] = useActionState(createAdminAction, null);
  const [pending, start] = useTransition();
  const { show, el } = useToast();
  const msg = (r: { ok: boolean; error?: string } | null, okMsg: string) => r && (r.ok ? <p className="text-sm text-primary">{okMsg}</p> : <p className="text-sm text-red-600">{r.error === "invalid" ? p("كلمة المرور الحالية غير صحيحة", "Current password is incorrect") : r.error === "weak" ? p("كلمة المرور يجب أن تكون 10 أحرف على الأقل", "Password must be at least 10 characters") : r.error}</p>);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {el}
      <PageTitle>{p("الحساب والأمان", "Account & Security")}</PageTitle>
      <form action={profAction} className="card space-y-3 p-5">
        <h2 className="font-bold">{p("بيانات الحساب", "Profile")} {me.isPrimary && <span className="badge bg-primary/10 text-primary-dark">{p("المدير الأساسي", "Primary admin")}</span>}</h2>
        <Field label={p("الاسم", "Name")}><input name="name" className="input" defaultValue={me.name} required /></Field>
        <Field label={p("البريد الإلكتروني", "Email")}><input name="email" type="email" className="input" dir="ltr" defaultValue={me.email} required /></Field>
        {msg(prof, p("تم التحديث", "Updated"))}
        <button className="btn-primary" disabled={profPending}>{p("حفظ", "Save")}</button>
      </form>
      <form action={pwAction} className="card space-y-3 p-5">
        <h2 className="font-bold">{p("تغيير كلمة المرور", "Change password")}</h2>
        <Field label={p("كلمة المرور الحالية", "Current password")}><input name="current" type="password" className="input" dir="ltr" required autoComplete="current-password" /></Field>
        <Field label={p("كلمة المرور الجديدة (10 أحرف على الأقل)", "New password (min 10)")}><input name="next" type="password" className="input" dir="ltr" required minLength={10} autoComplete="new-password" /></Field>
        {msg(pw, p("تم تغيير كلمة المرور", "Password changed"))}
        <button className="btn-primary" disabled={pwPending}>{p("تغيير", "Change")}</button>
      </form>
      {me.isPrimary && (
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">{p("المديرون", "Administrators")}</h2>
          <p className="text-xs text-gray-500">{p("المدير الأساسي فقط يمكنه إضافة أو حذف مديرين آخرين.", "Only the primary admin can add or remove other admins.")}</p>
          <ul className="divide-y text-sm">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{a.name} · <span dir="ltr">{a.email}</span> {a.isPrimary && <span title={p("المدير الأساسي", "Primary")} className="text-amber-500"><I.star className="inline h-3.5 w-3.5" /></span>}</span>
                {!a.isPrimary && (
                  <span className="flex gap-1">
                    <button className="btn-outline !py-1 !px-2 text-xs" disabled={pending} onClick={() => { const np = prompt(p("كلمة مرور جديدة (10 أحرف على الأقل):", "New password (min 10 chars):")); if (np) start(async () => { const r = await resetAdminPasswordAction(a.id, np); show(r.ok ? p("تم", "Done") : r.error, r.ok ? "ok" : "err"); }); }}>🔑</button>
                    <ConfirmButton className="btn-danger !py-1 !px-2" onConfirm={() => start(async () => { await deleteAdminAction(a.id); router.refresh(); })}><I.trash className="h-3.5 w-3.5" /></ConfirmButton>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <form action={crAction} className="grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
            <input name="name" className="input" placeholder={p("الاسم", "Name")} required />
            <input name="email" type="email" className="input" dir="ltr" placeholder="email@example.com" required />
            <input name="password" type="password" className="input" dir="ltr" placeholder={p("كلمة مرور (10+)", "Password (10+)")} required minLength={10} />
            <div className="sm:col-span-3 flex items-center gap-3"><button className="btn-primary" disabled={crPending}><I.plus className="h-4 w-4" /> {p("إضافة مدير", "Add admin")}</button>{msg(cr, p("تمت الإضافة", "Added"))}</div>
          </form>
        </section>
      )}
    </div>
  );
}
