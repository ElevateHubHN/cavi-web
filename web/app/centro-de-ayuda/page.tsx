import type { Metadata } from "next";
import { CentroAyudaClient } from "@/components/centro-ayuda/centro-ayuda-client";

export const metadata: Metadata = {
  title: "Centro de ayuda · Repuestos CAVI",
  description:
    "Centro de ayuda y soporte al cliente de Repuestos CAVI: formas de pago, políticas de envío, garantías, cambios, devoluciones y preguntas frecuentes.",
};

export default function CentroDeAyudaPage() {
  return <CentroAyudaClient initialTab="formas-de-pago" />;
}
