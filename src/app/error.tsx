"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <div className="text-6xl">⚠️</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">حدث خطأ غير متوقع / Something went wrong</h1>
        <p className="mt-2 text-gray-600">تأكد من اتصال قاعدة البيانات ثم حاول مرة أخرى · Check the database connection and try again</p>
        <button onClick={reset} className="btn-primary mt-6">إعادة المحاولة / Retry</button>
      </div>
    </div>
  );
}
