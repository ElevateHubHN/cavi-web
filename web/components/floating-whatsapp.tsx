import { company } from "@/lib/company";
import { WhatsAppIcon } from "./icons";

export function FloatingWhatsApp() {
  const whatsapp = company.whatsapp[0];

  return (
    <a
      href={whatsapp.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Contactar por WhatsApp ${whatsapp.label}`}
      title="WhatsApp"
      className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)] ring-4 ring-white transition-transform hover:-translate-y-0.5 hover:bg-[#1EBD5A] focus:outline-none focus:ring-[#DDF8E7] sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
    >
      <WhatsAppIcon size={30} />
    </a>
  );
}
