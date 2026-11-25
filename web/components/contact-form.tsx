"use client";

import { useState } from "react";
import { SendIcon } from "./icons";
import { errorMessage, sendContactMessage } from "@/lib/portal";

const inputClass =
  "mt-[6px] h-[46px] w-full rounded-[9px] border-[1.5px] border-line-2 px-[13px] text-[14.5px] outline-none focus:border-navy";
const labelClass = "text-[13px] font-semibold text-muted";

const EMPTY = { name: "", company: "", email: "", phone: "", message: "" };

export function ContactForm() {
  const [fields, setFields] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFields((current) => ({ ...current, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    try {
      await sendContactMessage(fields);
      setFields(EMPTY);
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-line bg-white p-[30px]">
      <div className="mb-5 font-display text-[19px] font-bold text-navy">
        Envíanos un mensaje
      </div>

      {sent ? (
        <div className="rounded-xl border-[1.5px] border-green/30 bg-green/5 p-6 text-center">
          <div className="font-display text-lg font-bold text-navy">
            ¡Gracias! Mensaje recibido.
          </div>
          <p className="mt-2 text-sm text-muted">
            Un asesor te responderá lo antes posible.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 text-sm font-bold text-red hover:underline"
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Nombre *</span>
              <input
                required
                maxLength={120}
                value={fields.name}
                onChange={set("name")}
                placeholder="Tu nombre"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Empresa</span>
              <input
                maxLength={120}
                value={fields.company}
                onChange={set("company")}
                placeholder="Empresa"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Correo *</span>
              <input
                required
                type="email"
                maxLength={200}
                value={fields.email}
                onChange={set("email")}
                placeholder="correo@empresa.com"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Teléfono *</span>
              <input
                required
                type="tel"
                maxLength={40}
                value={fields.phone}
                onChange={set("phone")}
                placeholder="+504 0000-0000"
                className={inputClass}
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className={labelClass}>Mensaje *</span>
            <textarea
              required
              maxLength={2000}
              value={fields.message}
              onChange={set("message")}
              placeholder="Indícanos el N° de parte, modelo de máquina o lo que necesitas cotizar…"
              className="mt-[6px] h-[118px] w-full resize-y rounded-[9px] border-[1.5px] border-line-2 px-[13px] py-[11px] text-[14.5px] outline-none focus:border-navy"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] font-semibold leading-[1.45] text-red"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="mt-[18px] flex h-[52px] w-full items-center justify-center gap-[9px] rounded-[10px] bg-red text-[15.5px] font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            <SendIcon size={19} />
            {sending ? "Enviando…" : "Enviar mensaje"}
          </button>
        </form>
      )}
    </div>
  );
}
