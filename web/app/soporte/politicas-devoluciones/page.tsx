import type { Metadata } from "next";
import { CentroAyudaClient } from "@/components/centro-ayuda/centro-ayuda-client";

export const metadata: Metadata = {
  title: "Políticas y devoluciones · Repuestos CAVI",
  description:
    "Condiciones de devolución, piezas no retornables, proceso de reclamo paso a paso y garantía de piezas en Repuestos CAVI.",
};

export default function PoliticasDevolucionesPage() {
  return <CentroAyudaClient initialTab="politica-de-cambios-y-devoluciones" />;
}
