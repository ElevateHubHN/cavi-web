"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "./icons";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-[30px] flex h-14 w-full max-w-[520px] items-center overflow-hidden rounded-[10px] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
    >
      <span className="grid place-items-center pl-4 pr-1">
        <SearchIcon size={20} strokeWidth={2.2} className="text-navy" />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="N° de parte o modelo"
        className="h-full min-w-0 flex-1 border-0 px-3 text-[14px] text-navy outline-none sm:text-[15px]"
      />
      <button
        type="submit"
        className="mr-[6px] h-11 shrink-0 rounded-lg bg-red px-4 text-[14px] font-bold text-white transition-colors hover:bg-red-dark sm:px-[22px] sm:text-[14.5px]"
      >
        Buscar
      </button>
    </form>
  );
}
