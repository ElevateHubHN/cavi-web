"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ruta antigua: redirige a /cotizacion para no romper enlaces guardados.
export default function CheckoutRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cotizacion");
  }, [router]);

  return null;
}
