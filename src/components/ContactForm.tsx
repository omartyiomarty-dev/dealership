"use client";
import { useState } from "react";
import { useT } from "./LangProvider";
import { I } from "./Icon";

type Props = { vehicleId?: number; vehicleTitle?: string; transactionType?: string };

export default function ContactForm({ vehicleId, vehicleTitle, transactionType }: Props) {
  const { t } = useT();
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [err, setErr] = useState<string>("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: vehicleTitle ? `${t("whatsapp_msg")} ${vehicleTitle}` : "" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      setErr(t("required_field"));
      return;
    }
    if (!/^[\d+\s()-]{7,20}$/.test(form.phone)) {
      setErr(t("invalid_phone"));
      return;
    }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setErr(t("invalid_email"));
      return;
    }
    setErr("");
    setState("sending");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vehicleId, transactionType, website: fd.get("website") }),
      });
      if (res.status === 429) {
        setErr(t("too_many_requests"));
        setState("error");
        return;
      }
      if (!res.ok) throw new Error();
      setState("ok");
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch {
      setErr(t("error_generic"));
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <div className="rounded-lg bg-primary/10 p-6 text-center text-primary-dark">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary"><I.check className="h-6 w-6" /></span>
        <p className="mt-2 font-semibold">{t("sent_success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <h3 className="text-lg font-bold text-gray-900">{vehicleTitle ? t("inquire_about") : t("contact_title")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-name">{t("your_name")} *</label>
          <input id="cf-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
        </div>
        <div>
          <label className="label" htmlFor="cf-phone">{t("your_phone")} *</label>
          <input id="cf-phone" className="input" dir="ltr" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={20} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cf-email">{t("your_email")} ({t("optional")})</label>
        <input id="cf-email" className="input" dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={150} />
      </div>
      <div>
        <label className="label" htmlFor="cf-msg">{t("your_message")} *</label>
        <textarea id="cf-msg" className="input min-h-28" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={2000} />
      </div>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={state === "sending"}>
        {state === "sending" ? t("sending") : t("send")}
      </button>
    </form>
  );
}
