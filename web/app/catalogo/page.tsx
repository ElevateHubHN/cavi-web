import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { WhatsAppCta } from "@/components/whatsapp-cta";

export const metadata = {
  title: "Catálogo · CAVI Repuestos Pesados",
};

export default function CatalogPage() {
  return (
    <>
      <Suspense fallback={<div className="shell py-16" />}>
        <CatalogView />
      </Suspense>
      <section className="shell pb-16">
        <WhatsAppCta />
      </section>
    </>
  );
}
