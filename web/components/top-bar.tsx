import Link from "next/link";
import { WhatsAppIcon, MapPinIcon } from "./icons";
import { company } from "@/lib/company";

export function TopBar() {
  return (
    <div className="bg-navy text-[13px] tracking-[0.02em] text-on-navy">
      <div className="shell flex items-center justify-center gap-4 py-[9px] sm:justify-between">
        <div className="flex items-center gap-[22px]">
          {company.whatsapp.map((w, i) => (
            <a
              key={w.label}
              href={w.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`items-center gap-[7px] transition-colors hover:text-white ${
                i === 0 ? "flex" : "hidden md:flex"
              }`}
            >
              <WhatsAppIcon size={14} className="text-red" />
              {w.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          <Link
            href="/#sucursales"
            className="flex items-center gap-[7px] transition-colors hover:text-white hover:underline hover:underline-offset-2"
          >
            <MapPinIcon size={14} className="text-red" />
            5 sucursales en Honduras
          </Link>
        </div>
      </div>
    </div>
  );
}
