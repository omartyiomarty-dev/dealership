"use client";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/admin/actions";
import { makeP, pick, type Lang } from "@/lib/i18n";
import LangSwitch from "@/components/LangSwitch";

export default function LoginForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const p = makeP(lang);
  return (
    <div className="grid min-h-screen place-items-center bg-gray-100 px-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{p("تسجيل دخول الإدارة", "Admin Login")}</h1>
          <LangSwitch />
        </div>
        <div>
          <label className="label" htmlFor="email">{p("البريد الإلكتروني", "Email")}</label>
          <input id="email" name="email" type="email" className="input" dir="ltr" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">{p("كلمة المرور", "Password")}</label>
          <input id="password" name="password" type="password" className="input" dir="ltr" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {state && !state.ok && (
          <p className="text-sm text-red-600" role="alert">
            {state.error === "locked" ? p("تم إيقاف المحاولات مؤقتاً، حاول بعد 15 دقيقة", "Too many attempts, try again in 15 minutes") : p("بيانات الدخول غير صحيحة", "Invalid credentials")}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "..." : p("دخول", "Sign in")}</button>
        <p className="text-center text-xs text-gray-500">{p("هذه الصفحة للأدمن فقط وغير مرتبطة بالموقع للزوار.", "This page is for admins only and is not linked from the public site.")}</p>
        <p className="text-center text-xs text-gray-500">{p("نسيت كلمة المرور؟ من الخادم نفّذ:", "Forgot password? On the server run:")}</p>
        <code className="block rounded bg-gray-100 p-2 text-center text-[11px] text-gray-700" dir="ltr">node scripts/reset-admin-password.mjs email new-password</code>
      </form>
    </div>
  );
}
