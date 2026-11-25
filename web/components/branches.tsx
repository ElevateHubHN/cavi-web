"use client";

import Image from "next/image";
import { useState } from "react";
import { branches, type Branch } from "@/lib/company";
import { MapPinIcon, ArrowRightIcon } from "./icons";

type View = "foto" | "mapa";

function BranchMedia({ branch }: { branch: Branch }) {
  const [view, setView] = useState<View>("foto");
  const label = `${branch.name} · ${branch.city}`;

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-[#E4E9F1]">
      {view === "foto" ? (
        <Image
          src={branch.photo}
          alt={`Fachada de ${label}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <iframe
          title={`Mapa ${label}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(
            branch.mapQuery
          )}&z=16&output=embed`}
          className="block h-full w-full border-0 [filter:grayscale(0.15)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}

      {branch.isHQ && (
        <span className="absolute left-3 top-3 rounded-full bg-red px-[10px] py-1 text-[11px] font-bold tracking-[0.04em] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
          CASA MATRIZ
        </span>
      )}

      <div
        role="group"
        aria-label={`Ver ${label}`}
        className="absolute bottom-3 right-3 flex overflow-hidden rounded-full bg-white/95 p-[3px] text-[12px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
      >
        {(["foto", "mapa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`rounded-full px-3 py-1 transition-colors ${
              view === v ? "bg-navy text-white" : "text-navy hover:text-red"
            }`}
          >
            {v === "foto" ? "Foto" : "Mapa"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Branches() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {branches.map((b) => (
        <div
          key={`${b.city}-${b.name}`}
          className="group flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-line bg-white transition-all hover:-translate-y-[3px] hover:border-navy hover:shadow-[0_14px_30px_rgba(11,37,69,0.08)]"
        >
          <BranchMedia branch={b} />

          <div className="flex flex-1 flex-col p-[22px]">
            <div className="font-display text-[19px] font-bold tracking-[-0.01em] text-navy">
              {b.city}
            </div>
            <div className="text-[13px] font-semibold text-red">{b.name}</div>
            <p className="mt-[10px] flex-1 text-[13.5px] leading-[1.55] text-muted">
              {b.address}
            </p>
            <a
              href={b.maps}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-[7px] text-sm font-bold text-navy transition-colors hover:text-red"
            >
              <MapPinIcon size={15} className="text-red" />
              Ver en mapa
              <ArrowRightIcon
                size={15}
                className="text-red transition-transform group-hover:translate-x-1"
              />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
