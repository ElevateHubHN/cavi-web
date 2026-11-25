import { company } from "@/lib/company";
import { WhatsAppIcon } from "./icons";

export function WhatsAppCta() {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-[30px] overflow-hidden rounded-[20px] bg-red px-8 py-10 sm:px-[52px] sm:py-12">
      <div className="pointer-events-none absolute -right-10 -top-10 h-[220px] w-[220px] rounded-full border-[30px] border-white/10" />
      <div className="relative">
        <h2 className="font-display text-[28px] font-black tracking-[-0.02em] text-white sm:text-[34px]">
          ¿No encuentras tu repuesto?
        </h2>
        <p className="mt-[10px] max-w-[520px] text-base text-[#FFE1E2]">
          Envíanos el N° de parte, la placa o una foto de tu equipo por WhatsApp
          y te ayudamos a ubicarlo al instante.
        </p>
      </div>
      <a
        href={company.whatsapp[0].href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex h-14 items-center gap-[10px] rounded-[10px] bg-navy px-8 text-base font-bold text-white transition-colors hover:bg-navy-dark"
      >
        <WhatsAppIcon size={19} />
        Escríbenos por WhatsApp
      </a>
    </div>
  );
}
