import Link from "next/link";
import { I } from "@/components/Icon";

/** Friendly page shown if the database is briefly unreachable or overloaded. */
export default function DbDown({ note }: { note?: string }) {
  return (
    <div className="container-x py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-400"><I.wrench className="h-8 w-8" /></span>
      <h1 className="mt-5 text-2xl font-bold text-gray-900">الخدمة مشغولة الآن</h1>
      <p className="mt-1 text-lg text-gray-500">Service temporarily busy</p>
      <p className="mx-auto mt-3 max-w-md text-gray-600">
        الضغط مرتفع حالياً أو الصيانة جارية. حدّث الصفحة بعد لحظات.
        <br />
        High traffic right now — please refresh in a moment.
      </p>
      {note && <p className="mt-3 font-mono text-xs text-gray-400" dir="ltr">{note}</p>}
      <Link href="/" className="btn-primary mt-7">تحديث الصفحة / Refresh</Link>
    </div>
  );
}
