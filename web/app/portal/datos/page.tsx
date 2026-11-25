"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { CheckIcon, LockIcon, LogOutIcon } from "@/components/icons";
import {
  changePassword,
  errorMessage,
  getAccount,
  logout,
  MIN_PASSWORD_LENGTH,
  updateAccount,
  type Account,
} from "@/lib/portal";

export default function PortalDataPage() {
  return (
    <PortalShell subtitle="Estos son los datos con los que te contactamos y facturamos.">
      <AccountCard />
    </PortalShell>
  );
}

const fieldClass =
  "flex flex-col gap-1 border-t border-[#EDF1F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4";
const fieldLabel = "text-[13px] font-semibold text-muted";
const fieldValue = "text-[15px] font-semibold text-navy sm:text-right";
const editInput =
  "h-[46px] w-full rounded-[9px] border-[1.5px] border-line-2 px-[13px] text-[14.5px] outline-none focus:border-navy sm:max-w-[320px]";

function AccountCard() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [rtn, setRtn] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  function fill(found: Account | null) {
    setAccount(found);
    setName(found?.name ?? "");
    setPhone(found?.phone ?? "");
    setCompany(found?.company ?? "");
    setRtn(found?.rtn ?? "");
  }

  useEffect(() => {
    getAccount({ fresh: true })
      .then(fill)
      .catch((failure) => setLoadError(errorMessage(failure)));
  }, []);

  if (loadError) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-line bg-soft px-5 py-[40px] text-center">
        <div className="font-display text-lg font-bold text-navy">
          No pudimos cargar tus datos
        </div>
        <p className="mt-2 text-muted">{loadError}</p>
      </div>
    );
  }

  if (account === undefined) {
    return <div className="h-[280px] animate-pulse rounded-[14px] border-[1.5px] border-line bg-soft" />;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    if (!name.trim() || !phone.trim()) {
      setSaveError("Escribe tu nombre y tu teléfono.");
      return;
    }
    setSaving(true);
    try {
      fill(await updateAccount({ name, phone, company, rtn }));
      setSaved(true);
    } catch (failure) {
      setSaveError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-[14px] font-display text-[19px] font-bold text-navy">
        Mis datos
      </h2>

      <form
        onSubmit={onSave}
        className="overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white"
      >
        <div className="bg-soft px-5 py-[13px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
          Datos de contacto
        </div>

        <label className={fieldClass}>
          <span className={fieldLabel}>Nombre</span>
          <input
            required
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            className={editInput}
          />
        </label>

        <div className={fieldClass}>
          <span className={fieldLabel}>Correo electrónico</span>
          <span className="flex items-center gap-2 sm:justify-end">
            <span className={fieldValue}>{account?.email || "—"}</span>
            {account?.emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green/25 bg-green/10 px-[9px] py-[3px] text-[11.5px] font-bold text-green">
                <CheckIcon size={12} />
                Verificado
              </span>
            )}
          </span>
        </div>

        <label className={fieldClass}>
          <span className={fieldLabel}>Teléfono / WhatsApp</span>
          <input
            required
            type="tel"
            value={phone}
            maxLength={40}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+504 0000-0000"
            className={editInput}
          />
        </label>

        <label className={fieldClass}>
          <span className={fieldLabel}>Empresa</span>
          <input
            value={company}
            maxLength={120}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Nombre de la empresa"
            className={editInput}
          />
        </label>

        <label className={fieldClass}>
          <span className={fieldLabel}>
            RTN (opcional)
            <span className="mt-[2px] block text-[12px] font-normal leading-[1.4] text-muted">
              Solo si necesitas factura con RTN.
            </span>
          </span>
          <input
            value={rtn}
            onChange={(e) => setRtn(e.target.value)}
            inputMode="numeric"
            maxLength={14}
            placeholder="00000000000000"
            className={editInput}
          />
        </label>

        <div className="border-t border-[#EDF1F6] px-5 py-4">
          <p className="text-[12.5px] leading-[1.5] text-muted">
            Usamos estos datos para emitir tu factura, coordinar la entrega y
            llenar tus próximas solicitudes. El correo no se cambia desde aquí.
          </p>
          {saveError && (
            <p
              role="alert"
              className="mt-3 rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] font-semibold leading-[1.45] text-red sm:max-w-[420px]"
            >
              {saveError}
            </p>
          )}
          {saved && (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 rounded-[10px] border border-green/25 bg-green/10 px-[14px] py-[10px] text-[13px] font-semibold text-green sm:max-w-[420px]"
            >
              <CheckIcon size={15} />
              Tus datos se guardaron.
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 inline-flex h-11 items-center gap-[9px] rounded-[9px] bg-red px-5 text-sm font-bold text-white transition-colors hover:bg-red-dark disabled:opacity-60"
          >
            Guardar cambios
          </button>
        </div>
      </form>

      <ChangePasswordCard email={account?.email ?? ""} />

      <button
        type="button"
        onClick={() => void logout().catch(() => undefined)}
        className="mt-5 inline-flex h-11 items-center gap-[9px] rounded-[9px] border-[1.5px] border-line-2 bg-white px-5 text-sm font-bold text-navy transition-colors hover:border-red hover:text-red"
      >
        <LogOutIcon size={17} />
        Cerrar sesión
      </button>
    </div>
  );
}

const passwordInput =
  "mt-[6px] h-[46px] w-full rounded-[9px] border-[1.5px] border-line-2 px-[13px] text-[14.5px] outline-none focus:border-navy sm:max-w-[320px]";

function ChangePasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaved(false);
        setBusy(true);
        try {
          const result = await changePassword(current, next, repeat);
          if (result.ok) {
            setSaved(true);
            setCurrent("");
            setNext("");
            setRepeat("");
          } else {
            setError(result.error);
          }
        } catch (failure) {
          setError(errorMessage(failure));
        } finally {
          setBusy(false);
        }
      }}
      className="mt-5 overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white"
    >
      <div className="bg-soft px-5 py-[13px] text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
        Cambiar clave
      </div>
      <div className="flex flex-col gap-3 border-t border-[#EDF1F6] px-5 py-4">
        {/* Campo de usuario oculto para que el gestor de claves asocie la clave nueva al correo. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label className="block">
          <span className={fieldLabel}>Clave actual</span>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={passwordInput}
          />
        </label>
        <label className="block">
          <span className={fieldLabel}>Clave nueva</span>
          <input
            required
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={passwordInput}
          />
          <span className="mt-[6px] block text-[12px] leading-[1.4] text-muted">
            Mínimo {MIN_PASSWORD_LENGTH} caracteres.
          </span>
        </label>
        <label className="block">
          <span className={fieldLabel}>Repite la clave nueva</span>
          <input
            required
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={passwordInput}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] font-semibold leading-[1.45] text-red sm:max-w-[420px]"
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-[10px] border border-green/25 bg-green/10 px-[14px] py-[10px] text-[13px] font-semibold text-green sm:max-w-[420px]"
          >
            <CheckIcon size={15} />
            Tu clave se actualizó.
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center gap-[9px] rounded-[9px] bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
          >
            <LockIcon size={16} />
            Guardar clave nueva
          </button>
        </div>
      </div>
    </form>
  );
}
