import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const API_LOCAL = process.env.CAVI_API_LOCAL ?? "http://127.0.0.1:3250";

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const base = {
    eslint: { ignoreDuringBuilds: true },
    // El optimizador de next/image requiere servidor; en el sitio estático las imágenes se sirven tal cual.
    images: { unoptimized: true },
  };

  // En producción nginx sirve web/out y pasa /api al backend; en desarrollo
  // `next dev` no exporta y hace ese mismo reenvío.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...base,
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${API_LOCAL}/api/:path*` }];
      },
    };
  }

  return { ...base, output: "export" };
}
