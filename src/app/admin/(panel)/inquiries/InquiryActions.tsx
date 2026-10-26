"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setInquiryStatusAction, deleteInquiryAction } from "@/app/admin/actions";
import { ConfirmButton, useP } from "@/components/admin/ui";
import { whatsappLink } from "@/lib/media-url";
import { I } from "@/components/Icon";

export default function InquiryActions({ id, status, phone }: { id: number; status: string; phone: string }) {
  const p = useP();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <a href={whatsappLink(phone, "")} target="_blank" rel="noopener noreferrer" className="btn-outline !px-2 !py-1 text-[#1a9e4b]" title="WhatsApp"><I.whatsapp className="h-3.5 w-3.5" /></a>
      <select className="input !w-auto !px-2 !py-1 text-xs" value={status} disabled={pending} onChange={(e) => run(() => setInquiryStatusAction(id, e.target.value as "new" | "contacted" | "closed"))}>
        <option value="new">{p("جديد", "New")}</option><option value="contacted">{p("تم التواصل", "Contacted")}</option><option value="closed">{p("مغلق", "Closed")}</option>
      </select>
      <ConfirmButton className="btn-danger !px-2 !py-1" onConfirm={() => run(() => deleteInquiryAction(id))}><I.trash className="h-3.5 w-3.5" /></ConfirmButton>
    </div>
  );
}
