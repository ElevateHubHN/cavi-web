import Link from "next/link";
import Image from "next/image";

// Proporción del logo original: 6312 x 1889 (≈ 3.34 : 1).
const RATIO = 6312 / 1889;

export function Logo({ variant = "header" }: { variant?: "header" | "footer" }) {
  // El header no tiene alto fijo, así que el logo puede crecer sin recortarse
  // y define el alto de la fila.
  const height = variant === "header" ? 54 : 40;
  const width = Math.round(height * RATIO);

  const img = (
    <Image
      src="/logo-cavi.png"
      alt="Repuestos CAVI"
      width={width}
      height={height}
      priority={variant === "header"}
      // Sin `style` inline: sobrescribiría estas clases y fijaría el alto.
      className="h-12 w-auto lg:h-[54px]"
    />
  );

  if (variant === "footer") {
    return (
      <Link href="/" className="inline-flex" aria-label="Repuestos CAVI — Inicio">
        <Image
          src="/logo-cavi.png"
          alt="Repuestos CAVI"
          width={width}
          height={height}
          className="h-9 w-auto"
        />
      </Link>
    );
  }

  return (
    <Link href="/" className="flex flex-shrink-0 items-center" aria-label="Repuestos CAVI — Inicio">
      {img}
    </Link>
  );
}
