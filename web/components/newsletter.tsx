"use client";

import { useState } from "react";
import { MailIcon, SendIcon, CheckIcon } from "./icons";
import { errorMessage, subscribeNewsletter } from "@/lib/portal";

/** Franja de suscripción al boletín, sobre las columnas del footer de todas las páginas. */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setError("");
    setSending(true);
    try {
      await subscribeNewsletter(email);
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-white/10 bg-navy">
      <div className="shell flex flex-col items-start gap-6 py-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-[14px]">
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-red/15 text-red sm:grid">
            <MailIcon size={21} />
          </span>
          <div>
            <div className="font-display text-[21px] font-extrabold tracking-[-0.01em] text-white">
              Suscríbete a nuestro boletín
            </div>
            <p className="mt-1 text-sm text-on-navy-2">
              Novedades, llegadas de inventario y promociones.
            </p>
          </div>
        </div>

        {sent ? (
          <div
            role="status"
            className="flex w-full items-center gap-[10px] rounded-[10px] border border-green/40 bg-green/15 px-[18px] py-[13px] text-sm font-semibold text-white lg:w-auto lg:min-w-[420px]"
          >
            <CheckIcon size={18} className="shrink-0 text-green" />
            ¡Listo! Te avisaremos de novedades.
          </div>
        ) : (
          <div className="w-full lg:w-auto lg:min-w-[420px]">
          <form
            onSubmit={onSubmit}
            className="flex w-full flex-col gap-[10px] sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@empresa.com"
              className="h-[46px] flex-1 rounded-[9px] border-[1.5px] border-white/15 bg-white/[0.06] px-[14px] text-[14.5px] text-white outline-none transition-colors placeholder:text-[#7E8DA6] focus:border-red"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex h-[46px] items-center justify-center gap-[9px] rounded-[9px] bg-red px-[22px] text-sm font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60"
            >
              Suscribirme
              <SendIcon size={16} />
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-2 text-[13px] font-semibold text-[#FF9C9C]">
              {error}
            </p>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
