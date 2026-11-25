import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

function Icon({
  size = 24,
  strokeWidth = 2,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </Icon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <rect x="2" y="4" width="20" height="16" rx="1" />
      <path d="M22 6 12 13 2 6" />
    </Icon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <circle cx="9" cy="21" r="1.4" />
      <circle cx="19" cy="21" r="1.4" />
      <path d="M2.5 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21.5 7H6" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="m22 2-11 11M22 2l-7 20-4-9-9-4 20-7Z" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.3} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M4 5h16M7 12h10M10 19h4" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.6} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </Icon>
  );
}

export function CubeIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M20.9 8.9 12 4 3.1 8.9 12 13.8l8.9-4.9Z" />
      <path d="M3.1 8.9V15L12 20l8.9-5V8.9" />
      <path d="M12 13.8V20" />
    </Icon>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <rect x="1" y="6" width="15" height="11" rx="1" />
      <path d="M16 9h4l3 3v5h-7" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="18" cy="18" r="1.6" />
    </Icon>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M12 8v4l3 2" />
      <circle cx="12" cy="12" r="9" />
    </Icon>
  );
}

/** Llave inglesa del isotipo de la marca; la inclinación la aplica quien lo usa. */
export function WrenchGlyph(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.3L3 18l3 3 6.4-6.3a4 4 0 0 0 5.3-5.4l-2.8 2.8-2.4-2.4Z" />
    </Icon>
  );
}

/** Imagen genérica para productos sin foto. */
export function PartPlaceholderIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.4} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </Icon>
  );
}

export function PartPlaceholderSimpleIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.4} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Icon>
  );
}

export function WhatsAppIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.07-.8.38-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.11 3.22 5.11 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .79.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

export function FacebookIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function InstagramIcon({ size = 24, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.4 3h-3.13v12.4a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.77.12v-3.2a5.83 5.83 0 0 0-.77-.05 5.8 5.8 0 1 0 5.8 5.8V9.01a7.4 7.4 0 0 0 4.33 1.39V7.27a4.28 4.28 0 0 1-3.2-1.45Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </Icon>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M15 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
      <path d="M16 16l5-4-5-4M21 12H9" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function HelpCircleIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4" />
      <path d="M12 17.4h.01" />
    </Icon>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M3 9 4.5 4h15L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18M9 20v-6h6v6" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </Icon>
  );
}

/* ---- Iconos de categorías ---- */

export function CatMotor(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M7 9h3l2-2h3v3l2 1h2v4h-2l-2 1v3h-3l-2-2H7l-2 2H3v-4h2V9H3V7l2 2Z" />
    </Icon>
  );
}

export function CatHidraulica(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M12 2s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11Z" />
    </Icon>
  );
}

export function CatTransmision(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <circle cx="7" cy="7" r="3.5" />
      <circle cx="17" cy="17" r="3.5" />
      <path d="M7 10.5v6M10.5 17h3M17 13.5v-6M13.5 7h-3" />
    </Icon>
  );
}

export function CatFrenos(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </Icon>
  );
}

export function CatFiltros(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
    </Icon>
  );
}

/** Eje motriz: dos ruedas unidas por la flecha, con el diferencial al centro. */
export function CatEjes(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <circle cx="5" cy="12" r="2.6" />
      <circle cx="19" cy="12" r="2.6" />
      <path d="M7.6 12h1.8M14.6 12h1.8" />
      <circle cx="12" cy="12" r="3.2" />
    </Icon>
  );
}

export function CatElectricos(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </Icon>
  );
}

export function CatRefrigeracion(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M12 2v20M4 7l16 10M20 7 4 17M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

export function ChevronsRightIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="m6 17 5-5-5-5M13 17l5-5-5-5" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}

import type { CategoryKey } from "@/lib/products";

export const categoryIcons: Record<
  CategoryKey,
  (props: IconProps) => React.ReactElement
> = {
  Motor: CatMotor,
  Hidráulica: CatHidraulica,
  Transmisión: CatTransmision,
  Frenos: CatFrenos,
  Filtros: CatFiltros,
  "Ejes y diferenciales": CatEjes,
  Eléctricos: CatElectricos,
  Refrigeración: CatRefrigeracion,
};
