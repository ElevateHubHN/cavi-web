import type { Metadata } from "next";
import { CentroAyudaClient } from "@/components/centro-ayuda/centro-ayuda-client";

export const metadata: Metadata = {
  title: "Soporte y Centro de ayuda · Repuestos CAVI",
  description:
    "Centro de ayuda y soporte de Repuestos CAVI: preguntas frecuentes sobre cotizaciones y envíos, formas de pago, políticas de garantías, cambios y devoluciones, y canales de atención.",
};

export default function SoportePage() {
  return <CentroAyudaClient initialTab="preguntas-frecuentes" />;
}
