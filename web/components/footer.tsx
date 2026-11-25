import Link from "next/link";
import { Logo } from "./logo";
import { Newsletter } from "./newsletter";
import {
  WhatsAppIcon,
  MailIcon,
  MapPinIcon,
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "./icons";
import { company } from "@/lib/company";

const CATALOGO = ["Motor", "Frenos", "Filtros", "Ejes y diferenciales"];
const EMPRESA = [
  { label: "Nosotros", href: "/nosotros" },
  { label: "Misión y visión", href: "/nosotros#mvv" },
  { label: "Sucursales", href: "/nosotros#sucursales" },
  { label: "Cómo pedir", href: "/catalogo" },
  { label: "Portal de clientes", href: "/portal" },
];
const SOPORTE = [
  { label: "Preguntas frecuentes", href: "/soporte#faq" },
  { label: "Formas de pago", href: "/formas-de-pago" },
  { label: "Centro de ayuda", href: "/formas-de-pago" },
  {
    label: "Políticas y devoluciones",
    href: "/soporte/politicas-devoluciones",
  },
];

function PayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-[6px] text-[12.5px] font-medium text-white/80">
      {children}
    </span>
  );
}

/** Logotipos simplificados de las tarjetas aceptadas. */
function VisaMark() {
  return (
    <span className="font-display text-[13px] font-black italic tracking-wider text-white">
      VISA
    </span>
  );
}

function MastercardMark() {
  return (
    <svg width="22" height="14" viewBox="0 0 24 15" fill="none" aria-hidden="true" className="shrink-0 text-white">
      <circle cx="8" cy="7.5" r="6" fill="currentColor" fillOpacity="0.9" />
      <circle cx="16" cy="7.5" r="6" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

function BankMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-white"
    >
      <path d="M3 9 12 4l9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18" />
    </svg>
  );
}

function CashMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-white"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-dark text-on-navy-2">
      <Newsletter />

      <div className="shell grid grid-cols-1 gap-10 py-[52px] pb-[30px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <Logo variant="footer" />
          <p className="mt-4 max-w-[320px] text-sm leading-[1.6]">
            Repuestos para camiones y equipo pesado. Desde 1997, con 5
            sucursales a nivel nacional y asesoría técnica para tu máquina.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={company.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-on-navy-2 transition-colors hover:border-red hover:text-white"
            >
              <FacebookIcon size={17} />
            </a>
            <a
              href={company.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-on-navy-2 transition-colors hover:border-red hover:text-white"
            >
              <InstagramIcon size={17} />
            </a>
            <a
              href={company.social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-on-navy-2 transition-colors hover:border-red hover:text-white"
            >
              <TikTokIcon size={16} />
            </a>
          </div>
        </div>

        <div>
          <div className="mb-[14px] font-display text-sm font-bold tracking-[0.04em] text-white">
            CATÁLOGO
          </div>
          <div className="flex flex-col gap-[9px] text-sm">
            {CATALOGO.map((label) => (
              <Link
                key={label}
                href={`/catalogo?cat=${encodeURIComponent(label)}`}
                className="transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-[14px] font-display text-sm font-bold tracking-[0.04em] text-white">
            EMPRESA
          </div>
          <div className="flex flex-col gap-[9px] text-sm">
            {EMPRESA.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-[14px] font-display text-sm font-bold tracking-[0.04em] text-white">
            SOPORTE
          </div>
          <div className="flex flex-col gap-[9px] text-sm">
            {SOPORTE.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-[14px] font-display text-sm font-bold tracking-[0.04em] text-white">
            CONTACTO
          </div>
          <div className="flex flex-col gap-[10px] text-sm">
            {company.whatsapp.map((w) => (
              <a
                key={w.label}
                href={w.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[9px] transition-colors hover:text-white"
              >
                <WhatsAppIcon size={15} className="text-red" />
                {w.label}
              </a>
            ))}
            <a
              href={`mailto:${company.email}`}
              className="flex items-center gap-[9px] break-all transition-colors hover:text-white"
            >
              <MailIcon size={15} className="shrink-0 text-red" />
              {company.email}
            </a>
            <span className="flex items-start gap-[9px]">
              <MapPinIcon size={15} className="mt-0.5 shrink-0 text-red" />
              San Pedro Sula · El Progreso · Puerto Cortés · Tegucigalpa
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="shell flex flex-col items-center justify-between gap-4 py-5 text-[13px] text-[#6E7F99] xl:flex-row">
          <span className="text-center xl:text-left">© 2026 Repuestos CAVI. Todos los derechos reservados.</span>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/formas-de-pago" className="transition-opacity hover:opacity-80" title="Ver formas de pago">
              <PayBadge>
                <VisaMark />
              </PayBadge>
            </Link>
            <Link href="/formas-de-pago" className="transition-opacity hover:opacity-80" title="Ver formas de pago">
              <PayBadge>
                <MastercardMark />
                Mastercard
              </PayBadge>
            </Link>
            <Link href="/formas-de-pago" className="transition-opacity hover:opacity-80" title="Ver formas de pago">
              <PayBadge>
                <BankMark />
                Transferencia bancaria
              </PayBadge>
            </Link>
            <Link href="/formas-de-pago" className="transition-opacity hover:opacity-80" title="Ver formas de pago">
              <PayBadge>
                <CashMark />
                Efectivo en tienda
              </PayBadge>
            </Link>
          </div>

          <span className="text-center xl:text-right">Precios sujetos a cotización · Bajo pedido</span>
        </div>
      </div>
    </footer>
  );
}
