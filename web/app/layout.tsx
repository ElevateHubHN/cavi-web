import type { Metadata } from "next";
import { Archivo, Barlow, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-context";
import { TopBar } from "@/components/top-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { CartToast } from "@/components/cart-toast";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Repuestos CAVI · Repuestos para camiones y equipo pesado en Honduras",
  description:
    "Desde 1997. Repuestos para camiones, equipo pesado y vehículo liviano: motor, frenos, filtros, ejes y diferenciales y más. 5 sucursales en Honduras.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${archivo.variable} ${barlow.variable} ${plexMono.variable} font-sans text-ink`}
      >
        <CartProvider>
          <div className="flex min-h-screen flex-col bg-white">
            <TopBar />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <FloatingWhatsApp />
            <CartToast />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
