import type { SVGProps } from "react";
import type { LightLineIconName } from "@/lib/light-line";

/**
 * Iconos de la línea liviana, con el mismo estilo que components/icons.tsx:
 * 24x24, trazo currentColor y extremos redondeados.
 */

type Props = SVGProps<SVGSVGElement> & {
  name: LightLineIconName;
  size?: number;
};

const PATHS: Record<LightLineIconName, React.ReactNode> = {
  // Filtro de aceite tipo cartucho
  filter: (
    <>
      <rect x="6" y="7" width="12" height="14" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 11h12M6 15h12" />
    </>
  ),
  // Manguera curva con abrazadera
  hose: (
    <>
      <path d="M4 18c0-6 4-9 8-9s5-2 5-4" />
      <rect x="15" y="3" width="5" height="4" rx="1" />
      <path d="M2 16h4v4H2z" />
    </>
  ),
  // Banda / faja sobre poleas
  belt: (
    <>
      <circle cx="8" cy="12" r="5" />
      <circle cx="18" cy="14" r="3" />
      <path d="M8 7h10M8 17h10" />
    </>
  ),
  // Disco de freno con mordaza
  brake: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M17 6.5 19.5 4M6.5 17 4 19.5" />
    </>
  ),
  // Amortiguador / resorte
  suspension: (
    <>
      <path d="M12 2v3M12 19v3" />
      <path d="M8 6h8l-8 3h8l-8 3h8l-8 3h8" />
    </>
  ),
  // Batería / sistema eléctrico
  electrical: (
    <>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M7 8V6h3v2M14 8V6h3v2" />
      <path d="M8 13.5h3M15.5 12v3M14 13.5h3" />
    </>
  ),
  // Gota de lubricante
  oil: (
    <>
      <path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  // Empaque de culata
  gasket: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="8" cy="12" r="2.2" />
      <circle cx="15" cy="12" r="2.2" />
      <path d="M5 8.5h.01M19 8.5h.01M5 15.5h.01M19 15.5h.01" />
    </>
  ),
};

export function LightLineIcon({ name, size = 26, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
