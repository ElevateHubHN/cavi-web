import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/products";
import { ProductPurchase } from "@/components/product-purchase";
import { BrandLogo } from "@/components/brand-logo";
import { ProductImage } from "@/components/product-image";
import { WhatsAppCta } from "@/components/whatsapp-cta";

const thumbnailPositions = ["object-center", "object-left", "object-right", "object-bottom"];

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return { title: "Repuesto no encontrado · CAVI" };
  return {
    title: `${product.name} · ${product.brand} · CAVI Repuestos`,
    description: product.desc,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return (
    <div className="shell pb-16 pt-[26px]">
      <div className="mb-5 text-[13px] text-muted">
        <Link href="/">Inicio</Link> <span className="text-[#B7C1D0]">/</span>{" "}
        <Link href="/catalogo">Catálogo</Link>{" "}
        <span className="text-[#B7C1D0]">/</span>{" "}
        <span className="font-semibold text-navy">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-11 lg:grid-cols-2">
        <div>
          <div className="relative h-[420px] w-full overflow-hidden rounded-[14px] border-[1.5px] border-line bg-gradient-to-br from-soft-2 to-[#E4E9F1]">
            <ProductImage
              product={product}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-white/10" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {thumbnailPositions.map((position) => (
              <div
                key={position}
                className="relative h-[78px] overflow-hidden rounded-[10px] border-[1.5px] border-line bg-soft-2"
              >
                <ProductImage
                  product={product}
                  className={`object-cover ${position}`}
                  sizes="25vw"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-navy">
            {product.name}
          </h1>
          <BrandLogo
            name={product.brand}
            className="mt-2.5 h-[22px] w-[90px] justify-start text-[13px]"
            imgClassName="object-left"
          />
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="rounded-[7px] bg-soft-2 px-[11px] py-[6px] font-mono text-sm text-navy">
              N° {product.part}
            </span>
            <span className="flex items-center gap-[7px] text-[13.5px] font-bold text-green">
              <span className="h-2 w-2 rounded-full bg-green" />
              {product.cat} · Disponible bajo pedido
            </span>
          </div>

          <ProductPurchase productId={product.id} />

          <div className="mt-[22px]">
            <div className="mb-[10px] font-display text-[15px] font-bold text-navy">
              Compatible con
            </div>
            <div className="flex flex-wrap gap-2">
              {product.compat.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-line bg-soft-2 px-3 py-[6px] text-[13px] font-semibold text-ink-2"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-9 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h3 className="mb-4 font-display text-[22px] font-extrabold tracking-[-0.01em] text-navy">
            Descripción
          </h3>
          <p className="text-[15px] leading-[1.65] text-[#334]">{product.desc}</p>
          <p className="mt-[14px] text-[15px] leading-[1.65] text-[#334]">
            Todas nuestras piezas se verifican por número de parte y
            compatibilidad antes del despacho. Manejamos repuestos de calidad
            equivalente según disponibilidad y presupuesto del cliente.
          </p>
        </div>
        <div>
          <h3 className="mb-4 font-display text-[22px] font-extrabold tracking-[-0.01em] text-navy">
            Especificaciones
          </h3>
          <div className="overflow-hidden rounded-[12px] border-[1.5px] border-line">
            {product.specs.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-4 border-b border-[#EDF1F6] px-4 py-[13px] text-sm last:border-b-0"
              >
                <span className="text-muted">{k}</span>
                <span className="text-right font-semibold text-navy">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16">
        <WhatsAppCta />
      </div>
    </div>
  );
}
