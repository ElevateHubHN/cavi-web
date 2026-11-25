"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileTextIcon, LockIcon, MailIcon, UserIcon } from "./icons";
import {
  errorMessage,
  getAccount,
  login,
  logout,
  MIN_PASSWORD_LENGTH,
  onSessionChange,
  requestPasswordReset,
  resendConfirmation,
  setInitialPassword,
  type Account,
} from "@/lib/portal";

const TABS = [
  { label: "Mis cotizaciones", href: "/portal", icon: FileTextIcon },
  { label: "Mis datos", href: "/portal/datos", icon: UserIcon },
];

const inputClass =
  "mt-[6px] h-[46px] w-full rounded-[9px] border-[1.5px] border-line-2 px-[13px] text-[14.5px] outline-none focus:border-navy";

/**
 * Control de sesión, encabezado y navegación del portal.
 * Los hijos solo se montan con sesión, así que pueden leer datos del portal
 * en su propio useEffect sin volver a comprobar el acceso.
 */
export function PortalShell({
  subtitle = "Aquí puedes dar seguimiento a tus cotizaciones con CAVI.",
  children,
}: {
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // undefined = consultando al servidor; null = sin sesión.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");

  const sync = useCallback(() => {
    getAccount()
      .then((found) => {
        setLoadError("");
        setAccount(found);
      })
      .catch((error) => {
        setLoadError(errorMessage(error));
      });
  }, []);

  useEffect(() => {
    sync();
    return onSessionChange(sync);
  }, [sync]);

  if (account === undefined) {
    if (loadError) {
      return (
        <div className="shell py-20">
          <div className="mx-auto max-w-[440px] rounded-[14px] border-[1.5px] border-line bg-soft px-7 py-8 text-center">
            <div className="font-display text-[18px] font-bold text-navy">
              No pudimos abrir tu portal
            </div>
            <p className="mt-2 text-[14px] leading-[1.5] text-muted">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                sync();
              }}
              className="mt-5 inline-flex h-11 items-center rounded-[9px] bg-red px-6 text-sm font-bold text-white transition-colors hover:bg-red-dark"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="shell py-20">
        <div className="mx-auto h-[220px] max-w-[440px] animate-pulse rounded-[14px] border-[1.5px] border-line bg-soft" />
      </div>
    );
  }

  if (account === null) return <PortalLogin />;
  if (account.mustChangePassword) return <CreatePassword email={account.email} />;

  const firstName = account.name.trim().split(" ")[0] || "cliente";

  return (
    <div className="shell pb-16 pt-[30px]">
      <h1 className="font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
        Hola, {firstName}
      </h1>
      <p className="mb-6 mt-1 text-[15.5px] text-muted">{subtitle}</p>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[230px_1fr] lg:gap-8">
        <nav className="flex gap-2 overflow-x-auto rounded-[12px] border-[1.5px] border-line bg-white p-[6px] lg:sticky lg:top-[92px] lg:flex-col lg:overflow-visible">
          {TABS.map((tab) => {
            const active =
              tab.href === "/portal"
                ? pathname === "/portal" || pathname.startsWith("/portal/cotizacion")
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[42px] shrink-0 items-center gap-[9px] whitespace-nowrap rounded-[9px] px-[14px] text-[14.5px] font-bold transition-colors ${
                  active
                    ? "bg-navy text-white"
                    : "text-ink-2 hover:bg-soft hover:text-navy"
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

const primaryButton =
  "mt-4 flex h-[50px] w-full items-center justify-center gap-[9px] rounded-[10px] bg-red text-[15px] font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60";
const linkButton =
  "text-[13.5px] font-semibold text-muted underline-offset-2 hover:text-navy hover:underline";

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] font-semibold leading-[1.45] text-red"
    >
      {children}
    </p>
  );
}

function AuthCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell py-16">
      <div className="mx-auto max-w-[460px] overflow-hidden rounded-[14px] border-[1.5px] border-line shadow-[0_18px_40px_rgba(11,37,69,0.07)]">
        <div className="border-b border-line bg-soft px-7 py-6 text-center">
          <div className="mx-auto grid h-[52px] w-[52px] place-items-center rounded-[13px] bg-navy text-white">
            {icon}
          </div>
          <h1 className="mt-[14px] font-display text-[24px] font-extrabold tracking-[-0.02em] text-navy">
            {title}
          </h1>
          <p className="mt-1 text-[14.5px] text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

type LoginView = "login" | "unverified" | "forgot" | "sent";

function PortalLogin() {
  const [view, setView] = useState<LoginView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  function goTo(next: LoginView) {
    setError("");
    setView(next);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      icon={<UserIcon size={25} />}
      title="Portal de clientes"
      subtitle="Consulta el estado de tus cotizaciones con CAVI."
    >
      {view === "login" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            void run(async () => {
              const result = await login(email, password);
              if (result.ok) return;
              if (result.reason === "unverified") {
                setResent(false);
                setView("unverified");
              } else {
                setError("Correo o clave incorrectos.");
              }
            });
          }}
          className="px-7 py-6"
        >
          <label className="block">
            <span className="text-[13px] font-semibold text-muted">
              Correo electrónico
            </span>
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className={inputClass}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[13px] font-semibold text-muted">Clave</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && <FormError>{error}</FormError>}
          <button type="submit" disabled={busy} className={primaryButton}>
            <LockIcon size={18} />
            Ingresar
          </button>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => goTo("forgot")} className={linkButton}>
              ¿Olvidaste tu clave?
            </button>
          </div>
          <p className="mt-3 text-center text-[13px] leading-[1.5] text-muted">
            ¿Primera vez? Tu cuenta se crea al solicitar una cotización: te
            enviamos un correo para confirmarla con tu clave temporal.
          </p>
        </form>
      )}

      {view === "unverified" && (
        <div className="px-7 py-6">
          <div className="text-center">
            <div className="font-display text-[17px] font-bold text-navy">
              Confirma tu correo primero
            </div>
            <p className="mt-2 text-[14px] leading-[1.5] text-muted">
              Para entrar al portal, abre el enlace de confirmación que enviamos
              a <b className="font-semibold text-navy">{email.trim()}</b>.
            </p>
          </div>
          {resent ? (
            <p className="mt-5 rounded-[10px] border border-line bg-soft px-[14px] py-3 text-center text-[13.5px] leading-[1.5] text-muted">
              Te enviamos un enlace nuevo con una clave temporal nueva. La
              anterior ya no sirve. Si no lo ves, revisa la carpeta de spam.
            </p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await resendConfirmation(email);
                  setResent(true);
                })
              }
              className={primaryButton}
            >
              <MailIcon size={18} />
              Reenviar enlace
            </button>
          )}
          {error && <FormError>{error}</FormError>}
          <div className="mt-4 text-center">
            <button type="button" onClick={() => goTo("login")} className={linkButton}>
              Volver a ingresar
            </button>
          </div>
        </div>
      )}

      {view === "forgot" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            void run(async () => {
              await requestPasswordReset(email);
              setView("sent");
            });
          }}
          className="px-7 py-6"
        >
          <div className="mb-4 text-center">
            <div className="font-display text-[17px] font-bold text-navy">
              Recupera tu acceso
            </div>
            <p className="mt-2 text-[14px] leading-[1.5] text-muted">
              Te enviaremos una clave temporal nueva. Al entrar te pediremos
              crear una clave propia.
            </p>
          </div>
          <label className="block">
            <span className="text-[13px] font-semibold text-muted">
              Correo electrónico
            </span>
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className={inputClass}
            />
          </label>
          {error && <FormError>{error}</FormError>}
          <button type="submit" disabled={busy} className={primaryButton}>
            <MailIcon size={18} />
            Enviarme una clave temporal
          </button>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => goTo("login")} className={linkButton}>
              Volver a ingresar
            </button>
          </div>
        </form>
      )}

      {view === "sent" && (
        <div className="px-7 py-6">
          <p className="rounded-[10px] border border-line bg-soft px-[14px] py-3 text-center text-[13.5px] leading-[1.5] text-muted">
            Si <b className="font-semibold text-navy">{email.trim()}</b> está
            registrado, te enviamos una clave temporal nueva. Si aún no
            confirmaste tu correo, te llega en su lugar un enlace de
            confirmación nuevo. Revisa tu bandeja de entrada y la carpeta de
            spam.
          </p>
          <button
            type="button"
            onClick={() => {
              setPassword("");
              goTo("login");
            }}
            className={primaryButton}
          >
            Ingresar con mi clave temporal
          </button>
        </div>
      )}
    </AuthCard>
  );
}

/** Pantalla obligatoria mientras la clave de la sesión sea temporal. */
function CreatePassword({ email }: { email: string }) {
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthCard
      icon={<LockIcon size={25} />}
      title="Crea tu clave"
      subtitle="Estás usando una clave temporal. Crea una propia para continuar."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const result = await setInitialPassword(next, repeat);
            if (!result.ok) setError(result.error);
          } catch (failure) {
            setError(errorMessage(failure));
          } finally {
            setBusy(false);
          }
        }}
        className="px-7 py-6"
      >
        {/* Campo de usuario oculto para que el gestor de claves asocie la clave nueva al correo. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label className="block">
          <span className="text-[13px] font-semibold text-muted">Clave nueva</span>
          <input
            required
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <span className="mt-[6px] block text-[12px] leading-[1.4] text-muted">
            Mínimo {MIN_PASSWORD_LENGTH} caracteres.
          </span>
        </label>
        <label className="mt-3 block">
          <span className="text-[13px] font-semibold text-muted">
            Repite la clave nueva
          </span>
          <input
            required
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <FormError>{error}</FormError>}
        <button type="submit" disabled={busy} className={primaryButton}>
          Guardar y entrar
        </button>
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void logout().catch(() => undefined)} className={linkButton}>
            Salir
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
