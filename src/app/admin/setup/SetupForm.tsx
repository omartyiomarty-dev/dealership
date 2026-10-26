"use client";
import { useActionState, useState } from "react";
import { setupAction } from "@/app/admin/actions";
import { makeP, pick, type Lang } from "@/lib/i18n";

export default function SetupForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(setupAction, null);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const p = makeP(lang);
  return (
    <div className="grid min-h-screen place-items-center bg-gray-100 px-4">
      <form action={action} className="card w-full max-w-md space-y-4 p-6">
        <h1 className="text-xl font-bold">🛡 {p("إنشاء حساب المدير الأساسي", "Create the primary admin account")}</h1>
        <p className="text-sm text-gray-600">{p("هذه الصفحة تعمل مرة واحدة فقط عندما لا يوجد أي مدير. بعد إنشاء الحساب تُغلق تلقائياً.", "This page works only once while no admin exists. It closes automatically after the account is created.")}</p>
        <div><label className="label">{p("الاسم", "Name")}</label><input name="name" className="input" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">{p("البريد الإلكتروني", "Email")}</label><input name="email" type="email" className="input" dir="ltr" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label">{p("كلمة المرور (10 أحرف على الأقل)", "Password (min 10 characters)")}</label><input name="password" type="password" className="input" dir="ltr" required minLength={10} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        {state && !state.ok && <p className="text-sm text-red-600">{state.error === "exists" ? p("يوجد مدير بالفعل", "An admin already exists") : p("تحقق من البيانات", "Check the fields")}</p>}
        <button className="btn-primary w-full" disabled={pending}>{p("إنشاء الحساب", "Create account")}</button>
      </form>
    </div>
  );
}
