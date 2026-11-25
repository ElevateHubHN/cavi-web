"use client";

import { useEffect, useRef, useState } from "react";
import { branches } from "@/lib/company";
import { citiesOf, hondurasDepartments } from "@/lib/honduras";
import {
  errorMessage,
  getAccount,
  submitQuote,
  type Account,
} from "@/lib/portal";
import { QuoteStepper } from "@/components/quote-stepper";
import { VehiclePhotoField } from "@/components/vehicle-photo-field";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LockIcon,
  SendIcon,
} from "@/components/icons";

/**
 * Solicitud de cotización en 3 pasos: contacto y vehículo, entrega y
 * facturación, y confirmación.
 *
 * Todo el estado vive aquí, así que "Atrás" no pierde lo escrito. La validación
 * es la nativa del navegador: como solo se renderizan los campos del paso
 * actual, "Continuar" (type="submit") valida los required de ese paso.
 * El envío al servidor ocurre solo en el paso 3.
 */

const inputClass =
  "mt-[6px] h-[46px] w-full rounded-[9px] border-[1.5px] border-line-2 px-[13px] text-[14.5px] outline-none focus:border-navy";
const selectClass = `${inputClass} cursor-pointer bg-white disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted-3`;
const labelClass = "text-[13px] font-semibold text-muted";
const sectionClass =
  "mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#8494AB]";
const hintClass = "mt-[6px] block text-[12px] leading-[1.4] text-muted";
const dividerClass = "my-[18px] h-px bg-[#EDF1F6]";

const branchOptions = branches.map((b) => `${b.name} · ${b.city}`);

const STEP_LABELS = ["Contacto", "Entrega", "Confirmar"];
const LAST_STEP = STEP_LABELS.length;

export type QuoteFormItem = {
  id: string;
  name: string;
  part: string;
  qty: number;
};

export type QuoteSubmitResult = {
  email: string;
  quoteId: string;
  /** Se envió con la sesión abierta: la cotización ya está en su portal. */
  signedIn: boolean;
};

type Props = {
  items: QuoteFormItem[];
  /** La página se encarga de vaciar el carrito y mostrar la pantalla de éxito. */
  onSuccess: (result: QuoteSubmitResult) => void;
};

export function QuoteForm({ items, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  // Paso 1: contacto y vehículo
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [equipment, setEquipment] = useState("");
  const [serial, setSerial] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  // Paso 2: entrega y facturación
  const [delivery, setDelivery] = useState<"envio" | "retiro">("envio");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [branch, setBranch] = useState("");
  const [rtn, setRtn] = useState("");

  // Paso 3: confirmación
  const [notes, setNotes] = useState("");

  /** Respaldo de la validación nativa, p. ej. para campos con solo espacios. */
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Con sesión abierta se precargan el contacto de la cuenta, su correo (fijo) y la
  // entrega de su última cotización.
  const [account, setAccount] = useState<Account | null>(null);
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const keepTyped = (value: string) => (current: string) => current || value;

  useEffect(() => {
    let active = true;
    getAccount()
      .then((found) => {
        if (!active || !found) return;
        setAccount(found);
        setName(keepTyped(found.name));
        setCompanyName(keepTyped(found.company ?? ""));
        setEmail(found.email);
        setPhone(keepTyped(found.phone));
        setRtn(keepTyped(found.rtn ?? ""));
        const last = found.lastDelivery;
        if (!last) return;
        const shipping = last.lastShipping;
        if (shipping) {
          setDepartment(keepTyped(shipping.department));
          setCity(keepTyped(shipping.city));
          setAddress(keepTyped(shipping.address));
          setReference(keepTyped(shipping.reference ?? ""));
        }
        const knownBranch = last.branch && branchOptions.includes(last.branch) ? last.branch : "";
        if (knownBranch) setBranch(keepTyped(knownBranch));
        setDelivery(last.mode);
        setDeliveryFrom(last.quoteId);
      })
      .catch(() => {
        // Si el servidor no responde, el formulario queda como para alguien sin sesión.
      });
    return () => {
      active = false;
    };
  }, []);

  const cityOptions = citiesOf(department);

  /** Mensaje si al paso le falta un dato obligatorio; "" si está completo. */
  function missingIn(target: number): string {
    if (target === 1 && (!name.trim() || !email.trim() || !phone.trim())) {
      return "Completa nombre, correo y teléfono para continuar.";
    }
    if (target === 2) {
      if (delivery === "envio" && (!department || !city || !address.trim())) {
        return "Indica departamento, ciudad y dirección de entrega.";
      }
      if (delivery === "retiro" && !branch) {
        return "Elige la sucursal donde retirarás las piezas.";
      }
    }
    return "";
  }

  /** Al cambiar de paso, sube al inicio del formulario si quedó fuera de vista. */
  function goToStep(next: number) {
    setStepError("");
    setStep(next);
    requestAnimationFrame(() => {
      const el = topRef.current;
      if (el && el.getBoundingClientRect().top < 0) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // En los pasos 1 y 2 el submit solo avanza: el navegador ya validó los required.
    if (step < LAST_STEP) {
      const problem = missingIn(step);
      if (problem) {
        setStepError(problem);
        return;
      }
      goToStep(step + 1);
      return;
    }

    // En el paso 3 se revisan de nuevo los pasos anteriores antes de enviar.
    for (const previous of [1, 2]) {
      const problem = missingIn(previous);
      if (problem) {
        goToStep(previous);
        setStepError(problem);
        return;
      }
    }

    setSubmitting(true);
    setStepError("");
    try {
      const result = await submitQuote(
        {
          name,
          email,
          phone,
          company: companyName,
          rtn,
          items: items.map((item) => ({
            productId: item.id,
            name: item.name,
            part: item.part,
            qty: item.qty,
          })),
          delivery:
            delivery === "envio"
              ? { mode: "envio", department, city, address, reference }
              : { mode: "retiro", branch },
          equipment,
          serial,
          notes,
        },
        photo
      );
      onSuccess({
        email: result.email,
        quoteId: result.quoteId,
        signedIn: result.inPortal,
      });
    } catch (error) {
      setSubmitting(false);
      setStepError(errorMessage(error));
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-5">
      <div ref={topRef} className="scroll-mt-4">
        <QuoteStepper steps={STEP_LABELS} current={step} onSelect={goToStep} />
      </div>
      <div className={dividerClass} />

      {step === 1 && (
        <>
          <div className={sectionClass}>Datos de contacto</div>
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className={labelClass}>Nombre completo *</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Empresa</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nombre de la empresa"
                className={inputClass}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>
                  {account ? "Correo electrónico" : "Correo electrónico *"}
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  readOnly={account !== null}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className={`${inputClass} read-only:bg-soft read-only:text-muted`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Teléfono / WhatsApp *</span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+504 0000-0000"
                  className={inputClass}
                />
              </label>
            </div>
            {account && (
              <p className={hintClass}>
                Tus datos vienen de tu cuenta. Si cambias nombre, teléfono o
                empresa, el cambio queda solo en esta solicitud; para cambiarlos
                en tu cuenta, ve a Mis datos.
              </p>
            )}
          </div>

          <div className={dividerClass} />
          <div className={sectionClass}>Datos del vehículo</div>
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className={labelClass}>Marca / modelo del vehículo</span>
              <input
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Ej. cabezal 6x4 2019, motor diésel 12L"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>N° de serie (opcional)</span>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Serie del equipo"
                className={inputClass}
              />
            </label>
            <VehiclePhotoField file={photo} onChange={setPhoto} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={sectionClass}>Entrega</div>
          {deliveryFrom && (
            <p className="mb-3 rounded-[10px] border border-navy/15 bg-navy/5 px-[14px] py-[10px] text-[13px] leading-[1.45] text-ink-2">
              Igual que en tu última cotización ({deliveryFrom}). Puedes cambiarla.
            </p>
          )}
          <div className="flex flex-col gap-[10px]">
            <label
              className={`flex cursor-pointer items-center gap-[10px] rounded-[10px] border-[1.5px] px-[15px] py-[11px] ${
                delivery === "envio" ? "border-navy bg-soft" : "border-line-2"
              }`}
            >
              <input
                type="radio"
                name="entrega"
                checked={delivery === "envio"}
                onChange={() => setDelivery("envio")}
                className="h-4 w-4 accent-red"
              />
              <span>
                <b className="block text-[14.5px] text-navy">
                  Envío a dirección
                </b>
                <span className="text-[12.5px] text-muted">
                  A nivel nacional
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-center gap-[10px] rounded-[10px] border-[1.5px] px-[15px] py-[11px] ${
                delivery === "retiro" ? "border-navy bg-soft" : "border-line-2"
              }`}
            >
              <input
                type="radio"
                name="entrega"
                checked={delivery === "retiro"}
                onChange={() => setDelivery("retiro")}
                className="h-4 w-4 accent-red"
              />
              <span>
                <b className="block text-[14.5px] text-navy">
                  Retiro en tienda
                </b>
                <span className="text-[12.5px] text-muted">Teguc. / SPS</span>
              </span>
            </label>

            {delivery === "envio" ? (
              <>
                {/* En una columna: en el aside de 400px, dos columnas cortarían nombres
                    como "Distrito Central (Tegucigalpa)". */}
                <div className="grid grid-cols-1 gap-3">
                  <label className="block">
                    <span className={labelClass}>Departamento *</span>
                    <select
                      required
                      value={department}
                      onChange={(e) => {
                        setDepartment(e.target.value);
                        setCity("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Selecciona…</option>
                      {hondurasDepartments.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Ciudad / municipio *</span>
                    <select
                      required
                      disabled={!department}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">
                        {department ? "Selecciona…" : "Elige departamento"}
                      </option>
                      {cityOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>Dirección *</span>
                  <input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Colonia, calle, número de bodega…"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Punto de referencia</span>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Frente a la gasolinera Uno, portón azul"
                    className={inputClass}
                  />
                  <span className={hintClass}>
                    Nos ayuda a encontrar el lugar más rápido.
                  </span>
                </label>
              </>
            ) : (
              <label className="block">
                <span className={labelClass}>Sucursal para el retiro *</span>
                <select
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecciona una sucursal…</option>
                  {branchOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className={dividerClass} />
          <div className={sectionClass}>Facturación</div>
          <label className="block">
            <span className={labelClass}>RTN (opcional)</span>
            <input
              value={rtn}
              onChange={(e) => setRtn(e.target.value)}
              inputMode="numeric"
              maxLength={14}
              placeholder="00000000000000"
              className={inputClass}
            />
            <span className={hintClass}>
              Solo si necesitas factura con RTN.
            </span>
          </label>
        </>
      )}

      {step === 3 && (
        <>
          <div className={sectionClass}>Notas para el asesor</div>
          <label className="block">
            <span className={labelClass}>¿Algo más que debamos saber?</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles de la pieza: número de parte, medidas, urgencia…"
              className="mt-[6px] h-20 w-full resize-y rounded-[9px] border-[1.5px] border-line-2 px-[13px] py-[11px] text-[14.5px] outline-none focus:border-navy"
            />
          </label>

          <div className={dividerClass} />
          <div className={sectionClass}>Resumen de tu solicitud</div>

          <div className="rounded-[10px] border border-line bg-soft px-[14px] py-[10px]">
            <SummaryGroup title="Contacto">
              <SummaryRow label="Nombre">{name || "—"}</SummaryRow>
              {companyName && (
                <SummaryRow label="Empresa">{companyName}</SummaryRow>
              )}
              <SummaryRow label="Correo">{email || "—"}</SummaryRow>
              <SummaryRow label="Teléfono">{phone || "—"}</SummaryRow>
            </SummaryGroup>

            <SummaryGroup title="Vehículo">
              <SummaryRow label="Marca / modelo">
                {equipment || "No indicado"}
              </SummaryRow>
              {serial && <SummaryRow label="N° de serie">{serial}</SummaryRow>}
              {photo && <SummaryRow label="Foto">{photo.name}</SummaryRow>}
            </SummaryGroup>

            <SummaryGroup title={rtn ? "Entrega y facturación" : "Entrega"}>
              {delivery === "envio" ? (
                <>
                  <SummaryRow label="Modalidad">Envío a dirección</SummaryRow>
                  <SummaryRow label="Departamento">
                    {department || "—"}
                  </SummaryRow>
                  <SummaryRow label="Ciudad">{city || "—"}</SummaryRow>
                  <SummaryRow label="Dirección">{address || "—"}</SummaryRow>
                  {reference && (
                    <SummaryRow label="Referencia">{reference}</SummaryRow>
                  )}
                </>
              ) : (
                <>
                  <SummaryRow label="Modalidad">Retiro en tienda</SummaryRow>
                  <SummaryRow label="Sucursal">{branch || "—"}</SummaryRow>
                </>
              )}
              {rtn && <SummaryRow label="RTN">{rtn}</SummaryRow>}
            </SummaryGroup>

            <SummaryGroup title={`Piezas (${items.length})`} last>
              <ul className="flex flex-col gap-[7px] pt-[2px]">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold leading-[1.35] text-navy">
                        {item.name}
                      </span>
                      <span className="block font-mono text-[11.5px] text-muted">
                        N° {item.part}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-bold text-navy">
                      × {item.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </SummaryGroup>
          </div>

          <div className="mt-3 rounded-[10px] border border-line bg-soft px-[14px] py-3 text-[13px] leading-[1.5] text-muted">
            El precio se confirma por cotización según marca, disponibilidad y
            tiempo de entrega.
          </div>
        </>
      )}

      {stepError && (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-red/25 bg-red/5 px-[14px] py-[10px] text-[13px] leading-[1.45] font-semibold text-red"
        >
          {stepError}
        </p>
      )}

      <div className="mt-4 flex items-center gap-[10px]">
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-line-2 bg-white px-5 text-[14.5px] font-bold text-navy transition-colors hover:border-navy"
          >
            <ArrowLeftIcon size={16} />
            Atrás
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex h-[52px] flex-1 disabled:opacity-60 items-center justify-center gap-[9px] rounded-[10px] bg-red text-[15.5px] font-bold text-white transition-colors hover:bg-red-dark"
        >
          {step === LAST_STEP ? (
            <>
              <SendIcon size={19} />
              Solicitar cotización
            </>
          ) : (
            <>
              Continuar
              <ArrowRightIcon size={17} />
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-[12.5px] text-muted">
        <LockIcon size={14} className="text-green" />
        Sin compromiso
      </div>
    </form>
  );
}

/* Resumen del paso 3 */

function SummaryGroup({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? "py-[10px]" : "border-b border-line py-[10px]"}>
      <div className="mb-[2px] text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#8494AB]">
        {title}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="shrink-0 text-[12.5px] text-muted">{label}</span>
      <span className="min-w-0 break-words text-right text-[13.5px] font-semibold text-navy">
        {children}
      </span>
    </div>
  );
}
