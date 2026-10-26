"use client";
import { useEffect } from "react";

/** Admin error boundary: logs the problem and offers a retry instead of a blank page. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the real cause in the server/browser console for debugging.
    console.error("[admin]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl text-red-600">!</div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">حدث خطأ في لوحة التحكم</h1>
        <p className="mt-1 text-gray-500">Something went wrong in the admin panel</p>
        {error.digest && <p className="mt-3 font-mono text-xs text-gray-400" dir="ltr">ref: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="btn-primary">إعادة المحاولة / Retry</button>
          <a href="/admin" className="btn-outline">لوحة التحكم / Dashboard</a>
        </div>
      </div>
    </div>
  );
}
