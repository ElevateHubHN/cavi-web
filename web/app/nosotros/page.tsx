import Link from "next/link";
import Image from "next/image";
import { Branches } from "@/components/branches";
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  CubeIcon,
  TruckIcon,
  StoreIcon,
  ClockIcon,
} from "@/components/icons";
import { BrandLogo } from "@/components/brand-logo";
import { focus, history, mission, vision, values } from "@/lib/company";
import { siteImages, truckBrands } from "@/lib/products";

export const metadata = {
  title: "Nosotros · Repuestos CAVI",
  description:
    "Más de dos décadas dedicados a la venta de repuestos para camiones y equipo pesado en Honduras. Conoce nuestra historia, misión, visión, valores y sucursales.",
};

const valueIcons = [ShieldCheckIcon, CubeIcon, TruckIcon, ClockIcon, StoreIcon];

export default function NosotrosPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_500px_at_88%_-10%,rgba(224,31,38,0.28),transparent_60%)]" />
        <div className="shell relative grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-[14px] text-[13px] text-on-navy">
              <Link href="/" className="hover:text-white">
                Inicio
              </Link>{" "}
              <span className="text-white/30">/</span>{" "}
              <span className="font-semibold text-white">Nosotros</span>
            </div>
            <div className="inline-flex items-center gap-[9px] rounded-full border border-white/[0.16] bg-white/[0.08] px-[14px] py-[7px] text-[12.5px] font-semibold tracking-[0.06em] text-on-navy">
              <span className="h-[7px] w-[7px] rounded-full bg-red" />
              DESDE 1997 · SAN PEDRO SULA
            </div>
            <h1 className="mt-[18px] max-w-[760px] font-display text-[36px] font-black leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
              Tu aliado en repuestos para{" "}
              <span className="text-red">camiones y equipo pesado</span>
            </h1>
            <div className="mt-9 flex flex-wrap gap-[30px]">
              <div>
                <div className="font-display whitespace-nowrap text-[22px] font-extrabold sm:text-[26px]">1997</div>
                <div className="text-[13px] text-on-navy-2">año de fundación</div>
              </div>
              <div className="w-px bg-white/[0.14]" />
              <div>
                <div className="font-display whitespace-nowrap text-[22px] font-extrabold sm:text-[26px]">
                  +25 años
                </div>
                <div className="text-[13px] text-on-navy-2">de trayectoria</div>
              </div>
              <div className="w-px bg-white/[0.14]" />
              <div>
                <div className="font-display whitespace-nowrap text-[22px] font-extrabold sm:text-[26px]">5</div>
                <div className="text-[13px] text-on-navy-2">sucursales</div>
              </div>
            </div>
          </div>
          <div className="relative h-[320px] overflow-hidden rounded-[20px] border-[6px] border-white/[0.08] bg-[#0a1e3b] lg:h-[390px]">
            <Image
              src={siteImages.heroParts}
              alt="Repuestos CAVI para camiones y equipo pesado"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-white/5" />
          </div>
        </div>
      </section>

      <section className="shell py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <div className="text-[13px] font-bold tracking-[0.14em] text-red">
              NUESTRA HISTORIA
            </div>
            <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
              Más de dos décadas impulsando tu camino.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] text-[#334]">{history}</p>
            <p className="mt-4 text-[16px] leading-[1.7] text-[#334]">
              En Repuestos CAVI tu satisfacción es nuestra prioridad. Nos
              especializamos en repuestos para camiones y equipo pesado, con la
              garantía de que cada pieza cumple con los más altos estándares de
              calidad.
            </p>
          </div>
          <div className="rounded-[20px] border-[1.5px] border-line bg-soft p-8">
            <div className="grid grid-cols-2 gap-5">
              {[
                { Icon: StoreIcon, k: "Casa matriz", v: "San Pedro Sula" },
                { Icon: TruckIcon, k: "Especialidad", v: "Camiones y equipo pesado" },
                { Icon: CubeIcon, k: "Cobertura", v: "Todo el país" },
                { Icon: ShieldCheckIcon, k: "Garantía", v: "Piezas verificadas" },
              ].map(({ Icon, k, v }) => (
                <div
                  key={k}
                  className="rounded-[14px] border-[1.5px] border-line bg-white p-5"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-[11px] bg-red/10 text-red">
                    <Icon size={22} />
                  </span>
                  <div className="mt-3 text-[13px] text-muted">{k}</div>
                  <div className="font-display text-[15.5px] font-bold text-navy">
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-16">
        <div className="mb-9 text-center">
          <div className="text-[13px] font-bold tracking-[0.14em] text-red">
            TRANSPORTE PESADO
          </div>
          <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
            Nuestro enfoque
          </h2>
          <p className="mx-auto mt-4 max-w-[720px] text-[16px] leading-[1.7] text-[#334]">
            {focus}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {truckBrands.map((name) => (
            <div
              key={name}
              className="flex h-[86px] items-center justify-center rounded-[14px] border-[1.5px] border-line bg-white px-6 py-4"
            >
              <BrandLogo name={name} className="h-full w-full" />
            </div>
          ))}
        </div>
      </section>

      <section id="mvv" className="scroll-mt-24 border-y border-[#E9EDF3] bg-soft">
        <div className="shell grid grid-cols-1 gap-6 py-16 lg:grid-cols-2">
          <div className="rounded-[18px] border-[1.5px] border-line bg-white p-8">
            <div className="inline-block rounded-md bg-red/10 px-[11px] py-[5px] text-[11px] font-bold tracking-[0.08em] text-red">
              MISIÓN
            </div>
            <p className="mt-4 text-[16px] leading-[1.7] text-[#334]">{mission}</p>
          </div>
          <div className="rounded-[18px] border-[1.5px] border-line bg-white p-8">
            <div className="inline-block rounded-md bg-navy/10 px-[11px] py-[5px] text-[11px] font-bold tracking-[0.08em] text-navy">
              VISIÓN
            </div>
            <p className="mt-4 text-[16px] leading-[1.7] text-[#334]">{vision}</p>
          </div>
        </div>
      </section>

      <section className="shell py-16">
        <div className="mb-9 text-center">
          <div className="text-[13px] font-bold tracking-[0.14em] text-red">
            LO QUE NOS MUEVE
          </div>
          <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
            Nuestros valores
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => {
            const Icon = valueIcons[i % valueIcons.length];
            return (
              <div
                key={v.title}
                className="rounded-[14px] border-[1.5px] border-line bg-white p-6"
              >
                <span className="grid h-[52px] w-[52px] place-items-center rounded-[11px] bg-soft-2 text-navy">
                  <Icon size={26} />
                </span>
                <div className="mt-4 font-display text-[19px] font-bold text-navy">
                  {v.title}
                </div>
                <p className="mt-2 text-[14px] leading-[1.6] text-muted">
                  {v.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="sucursales"
        className="scroll-mt-24 border-y border-[#E9EDF3] bg-soft"
      >
        <div className="shell py-16">
          <div className="mb-9 text-center">
            <div className="text-[13px] font-bold tracking-[0.14em] text-red">
              ESTAMOS CERCA DE TI
            </div>
            <h2 className="mb-[10px] mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
              Nuestras sucursales
            </h2>
            <p className="mx-auto max-w-[620px] text-[15.5px] text-muted">
              Cinco puntos de atención en Honduras para servirte mejor. Toca una
              sucursal para abrir la ubicación en Google Maps.
            </p>
          </div>
          <Branches />
        </div>
      </section>

      <section className="shell py-[60px]">
        <div className="relative flex flex-wrap items-center justify-between gap-[30px] overflow-hidden rounded-[20px] bg-red px-[52px] py-12">
          <div className="absolute -right-10 -top-10 h-[220px] w-[220px] rounded-full border-[30px] border-white/10" />
          <div className="relative">
            <h2 className="font-display text-[34px] font-black tracking-[-0.02em] text-white">
              ¿Buscas un repuesto en específico?
            </h2>
            <p className="mt-[10px] max-w-[520px] text-base text-[#FFE1E2]">
              Explora el catálogo y arma tu solicitud, o escríbenos por WhatsApp y
              un asesor te ayuda a ubicar la pieza.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="relative flex h-14 items-center gap-[10px] rounded-[10px] bg-navy px-8 text-base font-bold text-white transition-colors hover:bg-navy-dark"
          >
            Ir al catálogo <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
