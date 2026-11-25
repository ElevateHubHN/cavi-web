import type { Metadata } from "next";
import { CentroAyudaClient } from "@/components/centro-ayuda/centro-ayuda-client";

export const metadata: Metadata = {
  title: "Formas de pago · Repuestos CAVI",
  description:
    "Conozca las formas de pago aceptadas en Repuestos CAVI: transferencias bancarias en BAC Honduras, Banco de Occidente, Banrural, Banco Atlántida, Banco Promerica, Banco del País y Banco Lafise, tarjetas VISA, Mastercard, AMEX y pago contra entrega.",
};

export default function FormasDePagoPage() {
  return <CentroAyudaClient initialTab="formas-de-pago" />;
}
