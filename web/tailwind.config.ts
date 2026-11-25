import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marca
        navy: {
          DEFAULT: "#0B2545",
          dark: "#081A34",
        },
        red: {
          DEFAULT: "#E01F26",
          dark: "#C0161C",
        },
        green: "#1F8A4C",
        // Texto
        ink: "#0F1B34",
        "ink-2": "#26364F",
        muted: "#5B6B82",
        "muted-2": "#7E8DA6",
        "muted-3": "#9AA7BA",
        // Fondos y bordes
        soft: "#F5F7FA",
        "soft-2": "#F1F4F9",
        line: "#E3E8EF",
        "line-2": "#D7DEE8",
        "on-navy": "#B9C6DC",
        "on-navy-2": "#9FB0C9",
        "on-navy-3": "#C6D2E4",
      },
      fontFamily: {
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        sans: ["var(--font-barlow)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      maxWidth: {
        shell: "1240px",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // Duración pensada para los 20 logos del carrusel: si cambia la cantidad,
        // ajustarla para mantener la velocidad.
        marquee: "marquee 65s linear infinite",
        "toast-in": "toast-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
