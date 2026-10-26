"use client";
// Last-resort boundary: if the whole route tree throws, show a branded page
// with a retry button instead of a raw crash screen.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, Tahoma, sans-serif", background: "#f9fafb", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "1rem", padding: "2.5rem", maxWidth: "28rem" }}>
            <div style={{ fontSize: "2.5rem" }}>⚠️</div>
            <h1 style={{ fontSize: "1.25rem", margin: "1rem 0 .5rem", color: "#111827" }}>حدث خطأ غير متوقع</h1>
            <p style={{ color: "#4b5563", margin: "0 0 1.5rem" }}>Something went wrong. Please try again.</p>
            <button onClick={reset} style={{ background: "#16a34a", color: "#fff", border: 0, borderRadius: ".5rem", padding: ".7rem 1.5rem", fontWeight: 600, cursor: "pointer" }}>
              إعادة المحاولة / Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
