"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronsRightIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  WhatsAppIcon,
  MailIcon,
  PhoneIcon,
  StoreIcon,
  UserIcon,
  TrashIcon,
  FileTextIcon,
  HelpCircleIcon,
  ShieldCheckIcon,
  LockIcon,
  TruckIcon,
  ClockIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { company } from "@/lib/company";

export type TabKey =
  | "acerca-de-nosotros"
  | "preguntas-frecuentes"
  | "formas-de-pago"
  | "politica-de-envio"
  | "politica-de-cambios-y-devoluciones"
  | "politica-de-garantias"
  | "politica-de-promociones"
  | "politica-de-calidad"
  | "terminos-y-condiciones";

interface MenuItem {
  id: TabKey;
  label: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "acerca-de-nosotros", label: "Acerca de nosotros" },
  { id: "preguntas-frecuentes", label: "Preguntas frecuentes" },
  { id: "formas-de-pago", label: "Formas de pago" },
  { id: "politica-de-envio", label: "Política de envío" },
  {
    id: "politica-de-cambios-y-devoluciones",
    label: "Política de cambios y devoluciones",
  },
  { id: "politica-de-garantias", label: "Política de garantías" },
  { id: "politica-de-promociones", label: "Política de promociones" },
  { id: "politica-de-calidad", label: "Política de calidad" },
  { id: "terminos-y-condiciones", label: "Términos y Condiciones" },
];

interface BankAccount {
  bank: string;
  accountNumber: string;
  currency: "Lempiras" | "Dólares";
}

// Cuentas bancarias de Grupo HMC S.A. (Repuestos CAVI) para pagos por transferencia o depósito.
const BANK_ACCOUNTS: BankAccount[] = [
  { bank: "BAC Honduras", accountNumber: "730387691", currency: "Lempiras" },
  { bank: "Banco de Occidente", accountNumber: "11-212-002241-9", currency: "Lempiras" },
  { bank: "Banrural", accountNumber: "013-0301-023089-3", currency: "Lempiras" },
  { bank: "Banco Atlántida", accountNumber: "60111001867", currency: "Lempiras" },
  { bank: "Banco Promerica", accountNumber: "61191802", currency: "Lempiras" },
  { bank: "Banco del País", accountNumber: "10550009423", currency: "Lempiras" },
  { bank: "Banco Lafise", accountNumber: "210503000181", currency: "Lempiras" },
  { bank: "BAC Honduras", accountNumber: "742117961", currency: "Dólares" },
  { bank: "Banco de Occidente", accountNumber: "22-212-002562-4", currency: "Dólares" },
  { bank: "Banco Atlántida", accountNumber: "2020116708", currency: "Dólares" },
  { bank: "Banco Promerica", accountNumber: "2-1636444", currency: "Dólares" },
  { bank: "Banco del País", accountNumber: "22-055-001834-1", currency: "Dólares" },
  { bank: "Banco Lafise", accountNumber: "210604000568", currency: "Dólares" },
];

const BANK_GROUPS = [
  { currency: "Lempiras", title: "Cuentas de cheques en lempiras" },
  { currency: "Dólares", title: "Cuentas en dólares" },
] as const;

type FaqItem = {
  q: string;
  render: (setActiveTab: (t: TabKey) => void) => React.ReactNode;
};

const ALL_FAQS: FaqItem[] = [
  {
    q: "¿Cómo solicito una cotización?",
    render: () => (
      <>
        Busca las piezas en el{" "}
        <Link
          href="/catalogo"
          className="font-semibold text-navy underline decoration-red/40 underline-offset-2 hover:text-red"
        >
          catálogo
        </Link>{" "}
        y agrégalas a tu solicitud. Cuando termines, abre{" "}
        <Link
          href="/cotizacion"
          className="font-semibold text-navy underline decoration-red/40 underline-offset-2 hover:text-red"
        >
          Cotización
        </Link>
        , completa tus datos de contacto y envíala: un asesor te responde con
        disponibilidad, precio y tiempo de entrega. Si prefieres, también puedes
        escribirnos por WhatsApp con el número de parte o los datos de tu
        máquina.
      </>
    ),
  },
  {
    q: "¿Tienen precios en línea?",
    render: () => (
      <>
        No publicamos precios en el sitio. La disponibilidad y el costo de cada
        pieza varían según el proveedor, la línea y el tiempo de importación,
        por lo que trabajamos bajo cotización: te enviamos el precio vigente
        junto con el tiempo estimado de entrega para que decidas con información
        real.
      </>
    ),
  },
  {
    q: "¿Hacen envíos a todo el país?",
    render: (setActiveTab) => (
      <>
        Sí. Coordinamos envíos a todo Honduras desde cualquiera de nuestras
        sucursales, a través de empresas de encomienda y paquetería. El costo y
        el tiempo dependen del destino, el peso y el volumen de la pieza, y se
        confirman en la cotización antes de que autorices el pedido. Puedes
        consultar más en nuestra{" "}
        <button
          onClick={() => setActiveTab("politica-de-envio")}
          className="font-semibold text-navy underline decoration-red/40 underline-offset-2 hover:text-red"
        >
          política de envío
        </button>
        .
      </>
    ),
  },
  {
    q: "¿Puedo retirar en una sucursal?",
    render: () => (
      <>
        Claro. Al enviar tu solicitud puedes elegir la opción de retiro en tienda
        y seleccionar la sucursal que te quede más cerca. Te avisamos cuando el
        pedido esté listo para recoger. Consulta direcciones y horarios en{" "}
        <Link
          href="/nosotros#sucursales"
          className="font-semibold text-navy underline decoration-red/40 underline-offset-2 hover:text-red"
        >
          nuestras 5 sucursales
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Qué marcas y líneas manejan?",
    render: () => (
      <>
        Trabajamos repuestos de calidad equivalente para camiones, equipo pesado
        y vehículo liviano, en líneas de motor, hidráulica, transmisión, frenos,
        filtros, ejes y diferenciales, eléctricos y refrigeración. Cada pieza se
        cotiza según la marca y el modelo de tu unidad; si no ves lo que buscas
        en el catálogo, escríbenos y lo ubicamos por ti.
      </>
    ),
  },
  {
    q: "¿Cómo pago mi pedido?",
    render: (setActiveTab) => (
      <>
        Recibimos transferencia bancaria, tarjeta de crédito o débito y efectivo
        en tienda. Puedes consultar el detalle de cuentas bancarias y
        condiciones en nuestra sección de{" "}
        <button
          onClick={() => setActiveTab("formas-de-pago")}
          className="font-semibold text-navy underline decoration-red/40 underline-offset-2 hover:text-red"
        >
          formas de pago
        </button>
        . La forma de pago y las condiciones aplicables se confirman al momento
        de aprobar la cotización.
      </>
    ),
  },
  {
    q: "¿Emiten factura con RTN?",
    render: () => (
      <>
        Sí, emitimos factura fiscal a nombre de persona natural o jurídica.
        Indícanos la razón social y el RTN al momento de solicitar la cotización
        —o en el campo de comentarios del formulario— para que la factura salga
        correcta desde la primera vez.
      </>
    ),
  },
  {
    q: "¿Cómo doy seguimiento a mi cotización?",
    render: () => (
      <>
        Desde el{" "}
        <Link
          href="/portal"
          className="font-semibold text-navy underline decoration-red/40 underline-offset-2 hover:text-red"
        >
          portal de clientes
        </Link>{" "}
        puedes ver el estado de tus solicitudes, revisar el detalle de las
        piezas y consultar tu historial. También puedes escribirnos por WhatsApp
        con tu número de cotización y con gusto te actualizamos.
      </>
    ),
  },
];

export function CentroAyudaClient({
  initialTab = "formas-de-pago",
}: {
  initialTab?: TabKey;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  function copyToClipboard(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAccount(text);
      setTimeout(() => {
        setCopiedAccount(null);
      }, 2200);
    }
  }

  const primaryPhone = company.whatsapp[0]?.label || "+504 3176-0933";
  const secondaryPhone = company.whatsapp[1]?.label || "+504 9460-0488";

  return (
    <div className="bg-white min-h-[750px]">
      <div className="border-b border-[#E9EDF3] bg-soft/60">
        <div className="shell py-4">
          <nav className="flex items-center gap-2 text-[13px] text-muted">
            <Link href="/" className="hover:text-navy transition-colors">
              Inicio
            </Link>
            <span className="text-muted-3">/</span>
            <Link
              href="/soporte"
              onClick={() => setActiveTab("preguntas-frecuentes")}
              className="text-muted hover:text-navy transition-colors"
            >
              Centro de ayuda
            </Link>
            <span className="text-muted-3">/</span>
            <span className="font-semibold text-navy">
              {MENU_ITEMS.find((m) => m.id === activeTab)?.label || "Formas de pago"}
            </span>
          </nav>
        </div>
      </div>

      <div className="shell py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-10 lg:gap-14 items-start">
          <aside className="w-full lg:sticky lg:top-24">
            <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink pb-3 mb-1">
              Centro de ayuda
            </h2>

            <div className="flex flex-col border-t border-[#E5E7EB]">
              {MENU_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    type="button"
                    className={`group flex w-full items-center justify-between py-[13.5px] px-1 text-left border-b border-[#E5E7EB] transition-colors ${
                      isActive
                        ? "text-ink font-bold"
                        : "text-[#374151] font-medium hover:text-red"
                    }`}
                  >
                    <span className="text-[14.5px] leading-snug pr-3">
                      {item.label}
                    </span>

                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-150 ${
                        isActive
                          ? "bg-red text-white shadow-sm"
                          : "bg-[#E5E7EB] text-[#6B7280] group-hover:bg-[#D1D5DB] group-hover:text-navy"
                      }`}
                    >
                      <ChevronRightIcon size={14} strokeWidth={2.6} />
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="w-full max-w-[820px]">
            {activeTab === "formas-de-pago" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-7">
                  <span className="flex items-center text-red font-black text-[22px] sm:text-[26px] tracking-tighter leading-none select-none">
                    <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  </span>
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black tracking-[-0.02em] text-ink">
                    Formas de pago
                  </h1>
                </div>

                <section className="mb-8">
                  <h2 className="font-display text-[17px] sm:text-[18px] font-bold text-ink mb-2.5">
                    Tarjetas de Crédito o Débito
                  </h2>
                  <ol className="flex flex-col gap-1.5 text-[15px] leading-[1.65] text-[#2D3748]">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-ink">1.</span>
                      <span>Aceptamos tarjetas VISA, Mastercard y AMEX.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-ink">2.</span>
                      <span>
                        Sus compras están protegidas con certificados de seguridad para
                        garantizar transacciones seguras.
                      </span>
                    </li>
                  </ol>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-soft px-3 py-1.5 text-xs font-bold tracking-wider text-navy">
                      VISA
                    </span>
                    <span className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-soft px-3 py-1.5 text-xs font-bold tracking-wider text-navy">
                      Mastercard
                    </span>
                    <span className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-soft px-3 py-1.5 text-xs font-bold tracking-wider text-navy">
                      AMEX
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-soft px-3 py-1.5 text-xs font-medium text-muted">
                      <LockIcon size={13} className="text-green" />
                      Pago digital seguro y POS en sucursales
                    </span>
                  </div>
                </section>

                <section className="mb-8 pt-2">
                  <h2 className="font-display text-[17px] sm:text-[18px] font-bold text-ink mb-2.5">
                    Transferencia o Depósito Bancario
                  </h2>
                  <p className="text-[15px] leading-[1.65] text-[#2D3748] mb-3.5">
                    Puede realizar depósitos o transferencias a nombre de{" "}
                    <b className="font-semibold text-navy">{company.legalName}</b>{" "}
                    (Repuestos CAVI), RTN{" "}
                    <span className="font-mono font-semibold text-navy">{company.rtn}</span>,
                    en las siguientes cuentas en lempiras y dólares:
                  </p>

                  <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#FBFBFC] p-3.5 sm:p-5">
                    {BANK_GROUPS.map((group, groupIndex) => (
                      <div key={group.currency} className="flex flex-col gap-2">
                        <h3
                          className={`px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-muted ${
                            groupIndex > 0 ? "mt-3" : ""
                          }`}
                        >
                          {group.title}
                        </h3>
                        {BANK_ACCOUNTS.filter((acc) => acc.currency === group.currency).map((acc) => {
                          const isCopied = copiedAccount === acc.accountNumber;
                          return (
                            <div
                              key={acc.accountNumber}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-[#E2E8F0]"
                            >
                              <div className="flex items-start sm:items-center gap-2.5 text-[14.5px] text-[#2D3748]">
                                <span className="text-muted-2 font-mono text-sm mt-0.5 sm:mt-0">
                                  o
                                </span>
                                <div>
                                  <span className="font-semibold text-ink">
                                    {acc.bank}
                                  </span>{" "}
                                  <span className="text-muted">–</span>{" "}
                                  <span className="font-mono font-bold text-navy text-[15px]">
                                    {acc.accountNumber}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.accountNumber)}
                                className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-md border border-line-2 bg-white px-2.5 py-1 text-xs font-semibold text-navy hover:border-red hover:text-red transition-colors shadow-2xs"
                                title="Copiar número de cuenta"
                              >
                                {isCopied ? (
                                  <>
                                    <CheckIcon size={13} className="text-green" />
                                    <span className="text-green font-bold">¡Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <CopyIcon size={13} />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-8 pt-2">
                  <h2 className="font-display text-[17px] sm:text-[18px] font-bold text-ink mb-2.5">
                    Después de realizar su pago, envíe el comprobante a:
                  </h2>

                  <div className="flex flex-col gap-1.5 text-[15px] text-[#2D3748] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-2 font-mono text-sm">o</span>
                      <span className="text-muted">Correo:</span>
                      <a
                        href={`mailto:${company.email}`}
                        className="font-medium text-navy hover:text-red hover:underline"
                      >
                        {company.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-2 font-mono text-sm">o</span>
                      <span className="text-muted">WhatsApp:</span>
                      <a
                        href={`https://wa.me/50431760933?text=${encodeURIComponent(
                          "Hola Repuestos CAVI, adjunto mi comprobante de pago:"
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-navy hover:text-red hover:underline"
                      >
                        {primaryPhone}
                      </a>
                      <span className="text-muted-3">/</span>
                      <a
                        href={`https://wa.me/50494600488?text=${encodeURIComponent(
                          "Hola Repuestos CAVI, adjunto mi comprobante de pago:"
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-navy hover:text-red hover:underline"
                      >
                        {secondaryPhone}
                      </a>
                    </div>
                  </div>

                  <h3 className="font-display text-[16px] font-bold text-ink mb-2">
                    Incluya la siguiente información:
                  </h3>
                  <ul className="flex flex-col gap-1.5 text-[15px] text-[#2D3748] pl-1">
                    <li className="flex items-center gap-2">
                      <span className="text-muted-2 font-mono text-sm">o</span>
                      <span>Nombre completo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-muted-2 font-mono text-sm">o</span>
                      <span>Número de teléfono</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-muted-2 font-mono text-sm">o</span>
                      <span>Fecha del pedido</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-muted-2 font-mono text-sm">o</span>
                      <span>Número de pedido o cotización</span>
                    </li>
                  </ul>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/50431760933?text=${encodeURIComponent(
                        "Hola Repuestos CAVI, adjunto comprobante de pago para mi cotización/pedido:"
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-green px-4 text-sm font-bold text-white transition-colors hover:bg-green/90 shadow-xs"
                    >
                      <WhatsAppIcon size={17} />
                      Enviar comprobante por WhatsApp
                    </a>
                  </div>
                </section>

                <section className="mb-8 pt-2 border-t border-[#E5E7EB]">
                  <h2 className="font-display text-[17px] sm:text-[18px] font-bold text-ink mb-2.5 mt-6">
                    Pago contra entrega
                  </h2>
                  <p className="text-[15px] leading-[1.65] text-[#2D3748] mb-3">
                    Disponible únicamente en compras con retiro en sucursal en cualquiera
                    de nuestras 5 tiendas a nivel nacional (San Pedro Sula, El Progreso,
                    Puerto Cortés, Tegucigalpa La Laguna y Tegucigalpa La Cañada) o entregas
                    locales previa coordinación y aprobación de su asesor comercial.
                  </p>

                  <h3 className="font-display text-[16px] font-bold text-ink mb-2">
                    Contáctenos para más información:
                  </h3>
                  <div className="flex flex-col gap-1.5 text-[15px] text-[#2D3748]">
                    <div className="flex items-center gap-2">
                      <span className="text-muted font-medium">PBX / Teléfono:</span>
                      <span className="font-semibold text-navy">+(504) 2508-2233</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted font-medium">WhatsApp:</span>
                      <span className="font-semibold text-navy">
                        {primaryPhone} / {secondaryPhone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted font-medium">Correo:</span>
                      <a
                        href={`mailto:${company.email}`}
                        className="font-semibold text-navy hover:text-red hover:underline"
                      >
                        {company.email}
                      </a>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "acerca-de-nosotros" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Acerca de nosotros
                  </h1>
                </div>
                <div className="prose max-w-none text-[15.5px] leading-[1.75] text-[#2D3748] space-y-4">
                  <p>
                    En <b>Repuestos CAVI</b> nos enorgullece llevar más de dos décadas
                    dedicados a la comercialización de repuestos de calidad equivalente
                    para camiones y equipo pesado en Honduras. Fundada en septiembre de
                    1997, nuestra casa matriz opera en San Pedro Sula y brindamos respaldo
                    a todo el país con 5 sucursales estratégicas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                    <div className="rounded-xl border border-line bg-soft p-5">
                      <div className="font-display text-[17px] font-bold text-navy mb-2">
                        Nuestra Misión
                      </div>
                      <p className="text-[14px] text-muted leading-relaxed">
                        Proveer soluciones innovadoras y confiables en repuestos para
                        camiones y maquinaria pesada, con asesoría técnica personalizada y
                        logística ágil en todo el territorio hondureño.
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-soft p-5">
                      <div className="font-display text-[17px] font-bold text-navy mb-2">
                        5 Sucursales en Honduras
                      </div>
                      <p className="text-[14px] text-muted leading-relaxed">
                        San Pedro Sula (Casa Matriz), El Progreso, Puerto Cortés, Tegucigalpa
                        La Laguna y Tegucigalpa La Cañada.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/nosotros"
                      className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-dark transition-colors"
                    >
                      Conocer más de nuestra empresa
                      <ArrowRightIcon size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "preguntas-frecuentes" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Preguntas frecuentes
                  </h1>
                </div>

                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900 flex items-start gap-2.5">
                  <ClockIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    El listado oficial de preguntas frecuentes se encuentra en proceso de
                    validación comercial por el equipo de Repuestos CAVI. Haz clic en cada
                    pregunta para desplegar la respuesta.
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {ALL_FAQS.map((faq) => (
                    <details
                      key={faq.q}
                      className="group rounded-xl border border-line bg-white px-5 py-4 transition-colors open:border-line-2 open:bg-soft"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-bold text-navy [&::-webkit-details-marker]:hidden">
                        {faq.q}
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-2 bg-white text-navy transition-transform duration-200 group-open:rotate-180">
                          <ChevronDownIcon size={16} />
                        </span>
                      </summary>
                      <div className="mt-3 max-w-[800px] text-[15px] leading-[1.75] text-[#334]">
                        {faq.render(setActiveTab)}
                      </div>
                    </details>
                  ))}
                </div>

                <div className="mt-10 pt-8 border-t border-line">
                  <h2 className="font-display text-[20px] font-bold text-navy mb-4">
                    ¿Prefieres hablar directamente con un asesor?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col rounded-xl border border-line bg-white p-5">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-green/10 text-green mb-3">
                        <WhatsAppIcon size={22} />
                      </span>
                      <div className="font-display text-[16px] font-bold text-navy">
                        WhatsApp Directo
                      </div>
                      <p className="mt-1 text-[13.5px] text-muted flex-1">
                        Atención rápida para cotizaciones y repuestos.
                      </p>
                      <div className="mt-3 flex flex-col gap-1.5">
                        {company.whatsapp.map((w) => (
                          <a
                            key={w.label}
                            href={w.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold text-navy hover:text-red transition-colors"
                          >
                            <WhatsAppIcon size={14} className="text-green" />
                            {w.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col rounded-xl border border-line bg-white p-5">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-soft-2 text-navy mb-3">
                        <StoreIcon size={22} />
                      </span>
                      <div className="font-display text-[16px] font-bold text-navy">
                        5 Sucursales
                      </div>
                      <p className="mt-1 text-[13.5px] text-muted flex-1">
                        San Pedro Sula, El Progreso, Puerto Cortés y Tegucigalpa.
                      </p>
                      <Link
                        href="/nosotros#sucursales"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-red transition-colors"
                      >
                        Ver ubicaciones y horarios
                        <ArrowRightIcon size={13} />
                      </Link>
                    </div>

                    <div className="flex flex-col rounded-xl border border-line bg-white p-5">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-soft-2 text-navy mb-3">
                        <UserIcon size={22} />
                      </span>
                      <div className="font-display text-[16px] font-bold text-navy">
                        Portal de Clientes
                      </div>
                      <p className="mt-1 text-[13.5px] text-muted flex-1">
                        Consulta el estado de tus cotizaciones en curso.
                      </p>
                      <Link
                        href="/portal"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-red transition-colors"
                      >
                        Ingresar al portal
                        <ArrowRightIcon size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "politica-de-envio" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Política de envío
                  </h1>
                </div>

                <div className="space-y-6 text-[15px] leading-[1.75] text-[#2D3748]">
                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      1. Cobertura nacional a todo Honduras
                    </h2>
                    <p>
                      En Repuestos CAVI realizamos envíos a los 18 departamentos de
                      Honduras a través de empresas reconocidas de paquetería, encomiendas
                      y transporte de carga pesada.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      2. Tiempos de entrega
                    </h2>
                    <p>
                      Los tiempos de despacho varían entre 24 y 48 horas hábiles para
                      ciudades principales (San Pedro Sula, Tegucigalpa, Choluteca, La
                      Ceiba, Comayagua) y de 48 a 72 horas para municipios foráneos,
                      contados a partir de la confirmación del pago.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      3. Costos de flete y embalaje
                    </h2>
                    <p>
                      El costo del envío se confirma previamente en su cotización y depende
                      del peso, dimensiones y destino del repuesto. Todo producto es
                      embalado e inspeccionado para asegurar su integridad durante el
                      traslado.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      4. Retiro gratuito en cualquiera de nuestras 5 sucursales
                    </h2>
                    <p>
                      Puede optar por recoger su pedido sin costo adicional en cualquiera de
                      nuestras tiendas (San Pedro Sula Casa Matriz, El Progreso, Puerto Cortés,
                      Tegucigalpa La Laguna o Tegucigalpa La Cañada).
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "politica-de-cambios-y-devoluciones" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Política de cambios y devoluciones
                  </h1>
                </div>

                <div className="space-y-6 text-[15px] leading-[1.75] text-[#2D3748]">
                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      Condiciones de devolución
                    </h2>
                    <p>
                      Aceptamos solicitudes de devolución o cambio dentro de los{" "}
                      <b className="font-semibold text-navy">15 días calendario</b>{" "}
                      siguientes a la fecha de entrega o retiro de la pieza, siempre que se
                      cumplan las siguientes condiciones:
                    </p>
                    <ul className="mt-3 flex flex-col gap-2 pl-2">
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>La pieza no ha sido instalada, modificada ni sometida a uso.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Se presenta en su empaque original, completo y en buen estado, con
                          etiquetas y sellos intactos.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Se presenta el comprobante de compra (factura fiscal) o el número
                          de cotización asociado.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          La pieza corresponde a una línea de inventario regular y no a un
                          pedido especial bajo encargo exclusivo.
                        </span>
                      </li>
                    </ul>
                  </section>

                  <section className="pt-2 border-t border-line">
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      Piezas no retornables
                    </h2>
                    <p>
                      Por su naturaleza técnica o por tratarse de adquisiciones bajo encargo,
                      las siguientes piezas no admiten devolución:
                    </p>
                    <ul className="mt-3 flex flex-col gap-2 pl-2">
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Componentes eléctricos y electrónicos que ya fueron instalados o
                          conectados.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Pedidos especiales o piezas importadas bajo encargo específico del
                          cliente.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Piezas con evidencia de montaje forzado, golpes, rayones,
                          calentamiento o manipulación indebida.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>Empaques, juegos de sellos y consumibles abiertos o fraccionados.</span>
                      </li>
                    </ul>
                  </section>

                  <section className="pt-2 border-t border-line">
                    <h2 className="font-display text-[17px] font-bold text-navy mb-3">
                      Proceso de reclamo paso a paso
                    </h2>
                    <ol className="flex flex-col gap-3.5">
                      <li className="flex items-start gap-3.5 rounded-lg border border-line bg-soft/50 p-3.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-black text-white">
                          1
                        </span>
                        <div>
                          <div className="font-display text-[15px] font-bold text-navy">
                            Contáctanos
                          </div>
                          <p className="text-[14px] text-muted mt-0.5">
                            Escríbenos por WhatsApp o acércate a la sucursal con tu factura o
                            número de cotización.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3.5 rounded-lg border border-line bg-soft/50 p-3.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-black text-white">
                          2
                        </span>
                        <div>
                          <div className="font-display text-[15px] font-bold text-navy">
                            Describe el caso y adjunta evidencia
                          </div>
                          <p className="text-[14px] text-muted mt-0.5">
                            Indica el número de parte, los datos de la máquina y fotos del
                            repuesto y su empaque original.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3.5 rounded-lg border border-line bg-soft/50 p-3.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-black text-white">
                          3
                        </span>
                        <div>
                          <div className="font-display text-[15px] font-bold text-navy">
                            Revisión técnica
                          </div>
                          <p className="text-[14px] text-muted mt-0.5">
                            Nuestro departamento técnico evalúa la pieza y su estado físico.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3.5 rounded-lg border border-line bg-soft/50 p-3.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-black text-white">
                          4
                        </span>
                        <div>
                          <div className="font-display text-[15px] font-bold text-navy">
                            Resolución
                          </div>
                          <p className="text-[14px] text-muted mt-0.5">
                            Te confirmamos la solución aplicable: cambio por la pieza
                            correcta, nota de crédito o reembolso.
                          </p>
                        </div>
                      </li>
                    </ol>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <a
                        href={company.whatsapp[0].href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-green px-4 text-xs font-bold text-white hover:bg-green/90 transition-colors"
                      >
                        <WhatsAppIcon size={15} />
                        Iniciar reclamo por WhatsApp
                      </a>
                      <Link
                        href="/nosotros#sucursales"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-2 bg-white px-4 text-xs font-bold text-navy hover:border-navy transition-colors"
                      >
                        Ver sucursales para entrega física
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "politica-de-garantias" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Política de garantías
                  </h1>
                </div>

                <div className="space-y-6 text-[15px] leading-[1.75] text-[#2D3748]">
                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      1. Cobertura por defectos comprobados de fabricación
                    </h2>
                    <p>
                      Las piezas que comercializamos en Repuestos CAVI cuentan con garantía
                      contra defectos de fabricación, respaldando el estándar de calidad
                      equivalente para trabajo pesado. El plazo y condiciones específicas de
                      garantía se confirman al momento de emitir la cotización.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      2. Exclusiones de garantía
                    </h2>
                    <ul className="mt-2 flex flex-col gap-2 pl-2">
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Instalación incorrecta o manipulación forzada sin las herramientas
                          adecuadas.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>
                          Falta de lubricación, fluidos incompatibles o contaminación en
                          sistemas hidráulicos o de combustible.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>Sobrecarga, sobrecalentamiento o accidente de la unidad.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-[14.5px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        <span>Modificaciones o alteraciones realizadas a la pieza.</span>
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      3. Evaluación técnica
                    </h2>
                    <p>
                      Para procesar una garantía, la pieza debe presentarse en sucursal con
                      la factura correspondiente para su análisis técnico. El dictamen se
                      comunica oportunamente para coordinar el reemplazo o solución
                      procedente.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "politica-de-promociones" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Política de promociones
                  </h1>
                </div>

                <div className="space-y-6 text-[15px] leading-[1.75] text-[#2D3748]">
                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      1. Vigencia y disponibilidad
                    </h2>
                    <p>
                      Todas las promociones y descuentos especiales están sujetos a la
                      vigencia comunicada en nuestros canales oficiales o hasta agotar
                      existencias en sucursales.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      2. Descuentos por volumen y flotillas
                    </h2>
                    <p>
                      Ofrecemos condiciones preferenciales para compras corporativas,
                      flotillas y talleres mecánicos. Dichos descuentos se pactan
                      formalmente en la cotización comercial emitida.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      3. No acumulables
                    </h2>
                    <p>
                      Salvo indicación expresa, las promociones, cupones y descuentos por
                      volumen no son acumulables entre sí para una misma orden de compra.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "politica-de-calidad" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Política de calidad
                  </h1>
                </div>

                <div className="space-y-6 text-[15px] leading-[1.75] text-[#2D3748]">
                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      Estándar de calidad equivalente
                    </h2>
                    <p>
                      En Repuestos CAVI nos enfocamos en proveer repuestos con calidad
                      equivalente comprobada para camiones de las principales marcas del
                      transporte pesado. Cada línea y pieza es seleccionada bajo estrictos
                      criterios de durabilidad, compatibilidad exacta y resistencia.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      Inspección y respaldo
                    </h2>
                    <p>
                      Trabajamos con fabricantes internacionales de prestigio en líneas de
                      motor, frenos, filtros, transmisión, ejes y sistemas eléctricos. Cada
                      pieza cuenta con el respaldo técnico y asesoría experta de nuestro
                      equipo.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "terminos-y-condiciones" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-6">
                  <ChevronsRightIcon size={24} strokeWidth={3} className="text-red" />
                  <h1 className="font-display text-[28px] sm:text-[34px] font-black text-ink">
                    Términos y Condiciones
                  </h1>
                </div>

                <div className="space-y-6 text-[15px] leading-[1.75] text-[#2D3748]">
                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      1. Cotizaciones y precios
                    </h2>
                    <p>
                      Los precios en el sitio web están sujetos a cotización formal. Toda
                      cotización tiene una vigencia especificada en el documento emitido por
                      nuestro asesor y está sujeta a la disponibilidad de inventario al
                      momento de confirmar la orden.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      2. Facturación legal con RTN
                    </h2>
                    <p>
                      Todas las transacciones se realizan conforme a la legislación
                      tributaria vigente en Honduras ante el SAR, emitiendo factura comercial
                      con RTN a nombre de persona natural o jurídica.
                    </p>
                  </section>

                  <section>
                    <h2 className="font-display text-[17px] font-bold text-navy mb-2">
                      3. Pedidos especiales
                    </h2>
                    <p>
                      Para piezas bajo importación especial, se requiere un anticipo
                      confirmado para proceder con la orden ante el fabricante o proveedor
                      internacional.
                    </p>
                  </section>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
