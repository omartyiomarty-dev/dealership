"use client";
import Link from "next/link";
import { I } from "@/components/Icon";

/** Public error boundary: a friendly page rather than a crash screen. */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-400"><I.wrench className="h-8 w-8" /></span>
      <h1 className="mt-5 text-2xl font-bold text-gray-900">حدث خطأ غير متوقع</h1>
      <p className="mt-1 text-lg text-gray-500">Something went wrong</p>
      <p className="mx-auto mt-3 max-w-md text-gray-600">برجاء المحاولة مرة أخرى، وإن استمرت المشكلة تواصل معنا هاتفياً.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-gray-400" dir="ltr">ref: {error.digest}</p>}
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="btn-primary">إعادة المحاولة / Retry</button>
        <Link href="/" className="btn-outline">الرئيسية / Home</Link>
        <Link href="/contact" className="btn-outline">تواصل معنا / Contact</Link>
      </div>
    </div>
  );
}
