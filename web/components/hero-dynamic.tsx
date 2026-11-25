"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { siteImages } from "@/lib/products";
import styles from "./hero-dynamic.module.css";

/**
 * Hero que alterna entre equipo pesado ("máquina") y vehículo liviano ("vehículo"):
 * escribe y borra la palabra, funde el párrafo y cambia la imagen.
 *
 * El buscador, los stats y el badge llegan como `children` y `badge` para que
 * app/page.tsx siga siendo un server component.
 */

type Variant = {
  word: string;
  paragraph: string;
  image: string;
  imageAlt: string;
};

const VARIANTS: Variant[] = [
  {
    word: "máquina",
    paragraph:
      "Repuestos para camiones y equipo pesado: motor, frenos, filtros, ejes y diferenciales y más. Encuentra la pieza, agrégala a tu solicitud y recibe tu cotización.",
    image: siteImages.heroParts,
    imageAlt: "Repuestos para camiones y equipo pesado",
  },
  {
    word: "vehículo",
    paragraph:
      "También cubrimos vehículo liviano: filtros, mangueras, bandas y frenos para carros asiáticos y americanos. Encuentra la pieza, agrégala a tu solicitud y recibe tu cotización.",
    // Foto provisional del catálogo: falta una foto propia de vehículo liviano.
    image: "/images/products/p4.webp",
    imageAlt: "Repuestos para vehículo liviano",
  },
];

/** La palabra más larga reserva el ancho del hueco para que la línea no salte. */
const WIDEST_WORD = VARIANTS.reduce(
  (a, v) => (v.word.length > a.length ? v.word : a),
  ""
);

const HOLD_MS = 3000;
const TYPE_MS = 90;
const DELETE_MS = 45;

type Phase = "hold" | "deleting" | "typing";

export function HeroDynamic({
  badge,
  children,
}: {
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  // Se empieza con "máquina" completa: es lo que renderiza el servidor y lo que
  // queda fijo si el usuario pidió reducir el movimiento.
  const [index, setIndex] = useState(0);
  const [len, setLen] = useState(VARIANTS[0].word.length);
  const [phase, setPhase] = useState<Phase>("hold");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const word = VARIANTS[index].word;
    const delay =
      phase === "hold" ? HOLD_MS : phase === "typing" ? TYPE_MS : DELETE_MS;

    const timer = window.setTimeout(() => {
      if (phase === "hold") {
        setPhase("deleting");
      } else if (phase === "deleting") {
        if (len > 0) {
          setLen(len - 1);
        } else {
          setIndex((i) => (i + 1) % VARIANTS.length);
          setPhase("typing");
        }
      } else if (len < word.length) {
        setLen(len + 1);
      } else {
        setPhase("hold");
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [reduced, index, len, phase]);

  const active = reduced ? 0 : index;
  const typed = reduced
    ? VARIANTS[0].word
    : VARIANTS[index].word.slice(0, len);

  return (
    <div className="shell relative grid grid-cols-1 items-center gap-14 pb-[72px] pt-16 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <h1 className="mt-0 font-display text-[36px] font-black leading-[1.03] tracking-[-0.03em] sm:text-[58px]">
          El repuesto exacto
          <br />
          para tu{" "}
          {/* Hueco con el ancho de la palabra más larga, para que la coma y el salto
              de línea no se muevan al escribir o borrar. */}
          <span className="relative inline-block whitespace-pre">
            <span aria-hidden="true" className="invisible">
              {WIDEST_WORD}
            </span>
            <span className="absolute left-0 top-0 whitespace-pre">
              <span className="sr-only">{VARIANTS[active].word}</span>
              <span aria-hidden="true">{typed}</span>
              {!reduced && (
                <span aria-hidden="true" className={`${styles.cursor} text-red`} />
              )}
            </span>
          </span>
          ,
          <br />
          <span className="text-red">sin demoras.</span>
        </h1>

        {/* Las dos variantes comparten celda del grid y toman la altura de la más
            alta, así el fundido no empuja el buscador ni los stats. */}
        <div className="mt-5 grid max-w-[490px]">
          {VARIANTS.map((v, i) => (
            <p
              key={v.word}
              aria-hidden={i !== active}
              className={`col-start-1 row-start-1 text-[18px] leading-[1.55] text-on-navy-3 transition-opacity duration-500 ${
                i === active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {v.paragraph}
            </p>
          ))}
        </div>

        {children}
      </div>

      <div className="relative">
        {badge}
        <div className="relative h-[440px] w-full overflow-hidden rounded-[20px] border-[6px] border-white/[0.08] bg-[#0a1e3b]">
          {VARIANTS.map((v, i) => (
            <span
              key={v.word}
              aria-hidden={i !== active}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={v.image}
                alt={i === active ? v.imageAlt : ""}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover"
              />
            </span>
          ))}
          <span className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-white/5" />
        </div>
      </div>
    </div>
  );
}
