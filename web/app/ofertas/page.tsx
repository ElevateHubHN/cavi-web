import { OffersSection } from "@/components/offers-browser";
import { WhatsAppCta } from "@/components/whatsapp-cta";

export const metadata = {
  title: "Ofertas · Repuestos CAVI",
  description:
    "Repuestos para camiones, equipo pesado y vehículo liviano seleccionados con descuento especial en Repuestos CAVI. Agrégalos a tu cotización.",
};

export default function OfertasPage() {
  return (
    <>
      <OffersSection />

      <section className="shell py-16">
        <WhatsAppCta />
      </section>
    </>
  );
}
