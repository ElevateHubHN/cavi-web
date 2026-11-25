import Link from "next/link";
import Image from "next/image";
import { HeroSearch } from "@/components/hero-search";
import { HeroDynamic } from "@/components/hero-dynamic";
import { ContactForm } from "@/components/contact-form";
import { ProductCard } from "@/components/product-card";
import { Branches } from "@/components/branches";
import { BrandLogo } from "@/components/brand-logo";
import { WhatsAppCta } from "@/components/whatsapp-cta";
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  CubeIcon,
  TruckIcon,
  WhatsAppIcon,
  MailIcon,
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/icons";
import {
  products,
  categoryOrder,
  categoryCounts,
  categoryImages,
  formatCount,
  bannerBrands,
  truckBrands,
  engineBrands,
  steps,
} from "@/lib/products";
import { lightLineCategories, lightLineHref } from "@/lib/light-line";
import { company } from "@/lib/company";

const featured = products.slice(0, 4);

const categoryGroups = [
  {
    name: "Motor",
    tag: "Turbos, inyectores, bombas y kits de reparación",
    products: products.filter((p) => p.cat === "Motor").slice(0, 4),
  },
  {
    name: "Hidráulica",
    tag: "Bombas, válvulas, cilindros y sellos",
    products: products.filter((p) => p.cat === "Hidráulica").slice(0, 4),
  },
  {
    name: "Ejes y diferenciales",
    tag: "Coronas, mazas, baleros, king pins y semiejes",
    products: products
      .filter((p) => p.cat === "Ejes y diferenciales")
      .slice(0, 4),
  },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] font-bold tracking-[0.14em] text-red">
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_500px_at_88%_-10%,rgba(224,31,38,0.28),transparent_60%)]" />
        <HeroDynamic
          badge={
            <div className="absolute -left-[14px] -top-[14px] z-[2] -skew-x-6 rounded-lg bg-red px-[15px] py-[9px] text-[13px] font-extrabold text-white">
              <span className="inline-block skew-x-6">ENTREGA A NIVEL NACIONAL</span>
            </div>
          }
        >
          <HeroSearch />

          {/* Separación menor en móvil para que los stats no desborden en pantallas de 360px. */}
          <div className="mt-[34px] flex gap-[22px] sm:gap-[30px]">
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
            <div className="w-px bg-white/[0.14]" />
            <div>
              <div className="font-display whitespace-nowrap text-[22px] font-extrabold sm:text-[26px]">
                Nacional
              </div>
              <div className="text-[13px] text-on-navy-2">envíos a todo el país</div>
            </div>
          </div>
        </HeroDynamic>

        <div className="overflow-hidden border-t border-white/10 bg-black/[0.18]">
          <div className="shell flex items-center gap-[14px] py-4">
            <span className="whitespace-nowrap text-[12px] font-bold tracking-[0.14em] text-muted-2">
              MARCAS QUE DISTRIBUIMOS
            </span>
            <div className="flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
              <div className="flex w-max animate-marquee items-center gap-[44px]">
                {[...bannerBrands, ...bannerBrands].map((name, i) => (
                  <BrandLogo
                    key={`${name}-${i}`}
                    name={name}
                    className="h-[48px] w-[136px] rounded-[10px] bg-white p-1.5 shadow-sm"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell pb-5 pt-16">
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <SectionEyebrow>CATÁLOGO POR SISTEMA</SectionEyebrow>
            <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
              Encuentra por categoría
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="hidden items-center gap-[7px] pb-[6px] font-bold text-navy sm:flex"
          >
            Ver todo el catálogo <ArrowRightIcon size={17} className="text-red" />
          </Link>
        </div>
        {/* Con 10 categorías, 5 columnas en desktop dejan dos filas completas. */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {categoryOrder.map((cat) => (
              <Link
                key={cat}
                href={`/catalogo?cat=${encodeURIComponent(cat)}`}
                className="group flex flex-col gap-4 rounded-[14px] border-[1.5px] border-line bg-white p-[22px] transition-all hover:-translate-y-[3px] hover:border-navy hover:shadow-[0_14px_30px_rgba(11,37,69,0.08)]"
              >
                <span className="relative h-[58px] w-[74px] overflow-hidden rounded-[11px] bg-soft-2">
                  <Image
                    src={categoryImages[cat]}
                    alt={cat}
                    fill
                    sizes="74px"
                    className="object-cover"
                  />
                </span>
                <div>
                  <div className="font-display text-[18px] font-bold text-navy">
                    {cat}
                  </div>
                  <div className="mt-[3px] text-[13px] text-muted">
                    {formatCount(categoryCounts[cat])} referencias
                  </div>
                </div>
              </Link>
          ))}
        </div>
      </section>

      <section className="shell pb-5 pt-11">
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <SectionEyebrow>MÁS SOLICITADOS</SectionEyebrow>
            <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
              Repuestos destacados
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="hidden items-center gap-[7px] pb-[6px] font-bold text-navy sm:flex"
          >
            Explorar catálogo <ArrowRightIcon size={17} className="text-red" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} variant="featured" />
          ))}
        </div>
      </section>

      <section className="shell pb-[10px] pt-11">
        {categoryGroups.map((group) => (
          <div key={group.name} className="mb-11">
            <div className="mb-6 flex items-end justify-between gap-5 border-b-2 border-[#EDF1F6] pb-4">
              <div className="flex items-center gap-4">
                <span className="h-[38px] w-[6px] rounded-[3px] bg-red" />
                <div>
                  <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-navy">
                    {group.name}
                  </h2>
                  <div className="mt-[3px] text-sm text-muted">{group.tag}</div>
                </div>
              </div>
              <Link
                href={`/catalogo?cat=${encodeURIComponent(group.name)}`}
                className="flex items-center gap-[7px] whitespace-nowrap pb-1 text-sm font-bold text-navy"
              >
                Ver todo <ArrowRightIcon size={16} className="text-red" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {group.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="shell py-14">
        <div className="grid grid-cols-1 gap-[14px] rounded-[20px] border-[1.5px] border-line bg-soft p-11 md:grid-cols-2 lg:grid-cols-4">
          <div className="mb-2 lg:col-span-4">
            <h2 className="font-display text-[30px] font-extrabold tracking-[-0.02em] text-navy">
              Cómo funciona el pedido
            </h2>
            <p className="mt-2 text-[15.5px] text-muted">
              Sin precios en línea: cada solicitud se cotiza según marca, modelo y
              disponibilidad.
            </p>
          </div>
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-[14px] border-[1.5px] border-line bg-white p-[22px]"
            >
              <div className="grid h-[34px] w-[34px] place-items-center rounded-lg bg-red font-display text-[15px] font-black text-white">
                {s.n}
              </div>
              <div className="mt-[14px] font-display text-[17px] font-bold text-navy">
                {s.title}
              </div>
              <div className="mt-[6px] text-[13.5px] leading-[1.5] text-muted">
                {s.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#E9EDF3] bg-white">
        <div className="shell py-[60px]">
          <div className="mb-9 text-center">
            <SectionEyebrow>LÍNEA LIVIANA</SectionEyebrow>
            <h2 className="mb-[10px] mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
              Repuestos para carros asiáticos y americanos
            </h2>
            <p className="mx-auto max-w-[640px] text-[15.5px] text-muted">
              No solo atendemos equipo pesado: también surtimos vehículo liviano
              con filtros, mangueras, bandas, frenos, suspensión y más. Pídenos
              la pieza por marca y modelo y te la cotizamos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {lightLineCategories.map((c) => (
              <Link
                key={c.name}
                href={lightLineHref(c)}
                className="group flex flex-col gap-4 rounded-[14px] border-[1.5px] border-line bg-white p-[22px] transition-all hover:-translate-y-[3px] hover:border-navy hover:shadow-[0_14px_30px_rgba(11,37,69,0.08)]"
              >
                <span className="relative h-[58px] w-[74px] overflow-hidden rounded-[11px] bg-soft-2">
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    sizes="74px"
                    className="object-cover"
                  />
                </span>
                <div>
                  <div className="font-display text-[18px] font-bold text-navy">
                    {c.name}
                  </div>
                  <div className="mt-[3px] text-[13px] leading-[1.45] text-muted">
                    {c.tag}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy text-white">
        <div className="shell grid grid-cols-1 gap-9 py-[52px] md:grid-cols-3">
          {[
            {
              Icon: ShieldCheckIcon,
              title: "Asesoría técnica",
              text: "Identificamos la pieza correcta por N° de parte o por tu máquina.",
            },
            {
              Icon: CubeIcon,
              title: "Cobertura de marcas",
              // Mismas listas que «Nuestro enfoque» en /nosotros, para que no se desincronicen.
              text: `${truckBrands.join(", ")}, ${engineBrands.join(", ")}.`,
            },
            {
              Icon: TruckIcon,
              title: "Entrega nacional",
              text: "Despacho a todo el país y coordinación de importación bajo pedido.",
            },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <span className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-[11px] bg-red/[0.16]">
                <Icon size={24} className="text-red" />
              </span>
              <div>
                <div className="font-display text-[18px] font-bold">{title}</div>
                <div className="mt-[5px] text-sm leading-[1.5] text-on-navy">
                  {text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="sucursales" className="shell scroll-mt-24 pb-5 pt-16">
        <div className="mb-9 flex items-end justify-between gap-5">
          <div>
            <SectionEyebrow>ESTAMOS CERCA DE TI</SectionEyebrow>
            <h2 className="mt-2 font-display text-[34px] font-extrabold tracking-[-0.02em] text-navy">
              Nuestras sucursales
            </h2>
            <p className="mt-2 max-w-[560px] text-[15.5px] text-muted">
              Cinco puntos de atención en Honduras. Toca una sucursal para abrir
              la ubicación en Google Maps.
            </p>
          </div>
          <Link
            href="/nosotros#sucursales"
            className="hidden items-center gap-[7px] whitespace-nowrap pb-[6px] font-bold text-navy sm:flex"
          >
            Conócenos <ArrowRightIcon size={17} className="text-red" />
          </Link>
        </div>
        <Branches />
      </section>

      <section id="contacto" className="shell scroll-mt-24 pb-5 pt-16">
        <div className="mb-9 text-center">
          <SectionEyebrow>ESTAMOS PARA AYUDARTE</SectionEyebrow>
          <h2 className="mb-[10px] mt-2 font-display text-[36px] font-extrabold tracking-[-0.02em] text-navy">
            Contáctanos
          </h2>
          <p className="mx-auto max-w-[600px] text-[15.5px] text-muted">
            Escríbenos con el N° de parte o el modelo de tu máquina y un asesor te
            responde lo antes posible.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-7 lg:grid-cols-[1.05fr_1fr]">
          <ContactForm />

          <div className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-dark p-8 text-white">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[26px] border-white/[0.04]" />
            <div className="pointer-events-none absolute -bottom-20 -left-14 h-52 w-52 rounded-full border-[22px] border-white/[0.03]" />

            <div className="relative flex flex-1 flex-col">
              <div className="text-[12.5px] font-bold tracking-[0.16em] text-red">
                ATENCIÓN DIRECTA
              </div>
              <h3 className="mt-[10px] font-display text-[23px] font-extrabold tracking-[-0.01em]">
                Escríbenos por WhatsApp
              </h3>
              <p className="mt-[10px] text-[14.5px] leading-[1.55] text-on-navy">
                Comparte el N° de parte o el modelo de tu máquina y un asesor te
                atiende y prepara tu cotización.
              </p>

              <div className="mt-6 flex flex-col gap-[10px]">
                {company.whatsapp.map((w) => (
                  <a
                    key={w.label}
                    href={w.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-[14px] py-[12px] ring-1 ring-white/10 transition-all hover:bg-white/[0.1] hover:ring-white/25"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#25D366]/20 text-[#25D366]">
                        <WhatsAppIcon size={18} />
                      </span>
                      <span className="font-display text-[15.5px] font-bold tracking-[-0.01em]">
                        {w.label}
                      </span>
                    </span>
                    <ArrowRightIcon
                      size={16}
                      className="text-on-navy-2 transition-transform group-hover:translate-x-1 group-hover:text-white"
                    />
                  </a>
                ))}
                <a
                  href={`mailto:${company.email}`}
                  className="group flex items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-[14px] py-[12px] ring-1 ring-white/10 transition-all hover:bg-white/[0.1] hover:ring-white/25"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
                      <MailIcon size={18} />
                    </span>
                    <span className="break-all font-display text-[15.5px] font-bold tracking-[-0.01em]">
                      {company.email}
                    </span>
                  </span>
                  <ArrowRightIcon
                    size={16}
                    className="shrink-0 text-on-navy-2 transition-transform group-hover:translate-x-1 group-hover:text-white"
                  />
                </a>
              </div>

              <div className="mb-6 mt-auto h-px bg-white/10" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-semibold text-on-navy">
                  Síguenos
                </span>
                <div className="flex items-center gap-[10px]">
                  <a
                    href={company.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 transition-colors hover:border-red hover:bg-white/5"
                  >
                    <FacebookIcon size={17} />
                  </a>
                  <a
                    href={company.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 transition-colors hover:border-red hover:bg-white/5"
                  >
                    <InstagramIcon size={17} />
                  </a>
                  <a
                    href={company.social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 transition-colors hover:border-red hover:bg-white/5"
                  >
                    <TikTokIcon size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-[60px]">
        <WhatsAppCta />
      </section>
    </>
  );
}
