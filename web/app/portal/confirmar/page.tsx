"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon, MailIcon } from "@/components/icons";
import { confirmEmail, errorMessage, resendConfirmation } from "@/lib/portal";

const inputClass =
  "mt-[6px] h-[46px] w-full rounded-[9px] border-[1.5px] border-line-2 px-[13px] text-[14.5px] outline-none focus:border-navy";
const primaryButton =
  "flex h-[50px] w-full items-center justify-center gap-[9px] rounded-[10px] bg-red text-[15px] font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60";

const placeholder = (
  <div className="shell py-16">
    <div className="mx-auto h-[260px] max-w-[460px] animate-pulse rounded-[14px] border-[1.5px] border-line bg-soft" />
  </div>
);

/** El token llega por query param: con `output: "export"` no hay rutas dinámicas. */
export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={placeholder}>
      <ConfirmEmail />
    </Suspense>
  );
}

function ConfirmEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [result, setResult] = useState<"confirmed" | "invalid" | null>(null);
  const [failure, setFailure] = useState("");
  // El token es de un solo uso: un segundo canje (p. ej. el doble efecto de React en desarrollo)
  // lo daría por inválido.
  const redeemed = useRef<string | null>(null);

  useEffect(() => {
    if (redeemed.current === token) return;
    redeemed.current = token;
    confirmEmail(token)
      .then(setResult)
      .catch((error) => setFailure(errorMessage(error)));
  }, [token]);

  if (failure) {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-[460px] rounded-[14px] border-[1.5px] border-line bg-soft px-7 py-8 text-center">
          <h1 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-navy">
            No pudimos confirmar tu correo
          </h1>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-muted">{failure}</p>
          <button
            type="button"
            onClick={() => {
              setFailure("");
              redeemed.current = null;
              confirmEmail(token)
                .then(setResult)
                .catch((error) => setFailure(errorMessage(error)));
            }}
            className={`mt-6 ${primaryButton}`}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (result === null) return placeholder;

  return (
    <div className="shell py-16">
      <div className="mx-auto max-w-[460px] overflow-hidden rounded-[14px] border-[1.5px] border-line shadow-[0_18px_40px_rgba(11,37,69,0.07)]">
        {result === "confirmed" ? (
          <div className="px-7 py-8 text-center">
            <div className="mx-auto grid h-[52px] w-[52px] place-items-center rounded-full bg-green/10 text-green">
              <CheckIcon size={25} />
            </div>
            <h1 className="mt-[14px] font-display text-[24px] font-extrabold tracking-[-0.02em] text-navy">
              ¡Correo confirmado!
            </h1>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-muted">
              Tu cuenta ya está activa. Ingresa con tu correo y la clave temporal
              que te enviamos; enseguida te pediremos crear tu propia clave.
            </p>
            <Link href="/portal" className={`mt-6 ${primaryButton}`}>
              Ingresar a mi portal
            </Link>
          </div>
        ) : (
          <InvalidToken />
        )}
      </div>
    </div>
  );
}

function InvalidToken() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="px-7 py-8">
      <div className="text-center">
        <div className="mx-auto grid h-[52px] w-[52px] place-items-center rounded-full bg-red/10 text-red">
          <CloseIcon size={24} />
        </div>
        <h1 className="mt-[14px] font-display text-[24px] font-extrabold tracking-[-0.02em] text-navy">
          Enlace no válido
        </h1>
        <p className="mt-2 text-[14.5px] leading-[1.55] text-muted">
          Este enlace de confirmación ya se usó, venció o no es correcto. Si tu
          correo ya está confirmado, puedes ingresar al portal directamente.
        </p>
      </div>

      {sent === null ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const to = email.trim();
            try {
              await resendConfirmation(to);
              setSent(to);
            } catch (failure) {
              setError(errorMessage(failure));
            } finally {
              setBusy(false);
            }
          }}
          className="mt-6"
        >
          <label className="block">
            <span className="text-[13px] font-semibold text-muted">
              Pide otro enlace con tu correo
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className={inputClass}
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
          <button type="submit" disabled={busy} className={`mt-4 ${primaryButton}`}>
            <MailIcon size={18} />
            Enviarme otro enlace
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <p className="rounded-[10px] border border-line bg-soft px-[14px] py-3 text-[13.5px] leading-[1.5] text-muted">
            Si <b className="font-semibold text-navy">{sent}</b> tiene una
            cuenta pendiente de confirmar, te enviamos un enlace nuevo con una
            clave temporal nueva. Si no lo ves, revisa la carpeta de spam.
          </p>
        </div>
      )}

      <Link
        href="/portal"
        className="mt-5 block text-center text-[13.5px] font-semibold text-muted underline-offset-2 hover:text-navy hover:underline"
      >
        Ir al ingreso del portal
      </Link>
    </div>
  );
}
