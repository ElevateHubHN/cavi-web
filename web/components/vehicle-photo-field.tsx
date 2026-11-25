"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/portal";

/**
 * Foto opcional del vehículo (no de la pieza) que acompaña la solicitud.
 * Aquí se revisan el tipo y el tamaño para avisar antes de enviar; el servidor
 * los vuelve a comprobar por el contenido del archivo.
 */


function ImageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.8" cy="9.2" r="1.6" />
      <path d="m3.5 17.5 4.7-4.6a2 2 0 0 1 2.7 0l6.6 6.4" />
      <path d="m14.8 14.6 1.9-1.8a2 2 0 0 1 2.7 0l1.1 1.1" />
    </svg>
  );
}

function CloseIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const labelClass = "text-[13px] font-semibold text-muted";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
};

export function VehiclePhotoField({ file, onChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  // La vista previa es un object URL: se libera al cambiar o quitar la foto.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function accept(candidate: File | undefined | null) {
    if (!candidate) return;
    if (!PHOTO_TYPES.includes(candidate.type)) {
      setError("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    if (candidate.size > MAX_PHOTO_BYTES) {
      setError(`La foto pesa ${formatSize(candidate.size)}. El máximo es 5 MB.`);
      return;
    }
    setError("");
    onChange(candidate);
  }

  function clearPhoto() {
    setError("");
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <span className={labelClass}>Foto del vehículo (opcional)</span>

      {/* El input queda oculto; la zona para soltar la foto es lo que se ve y se pulsa. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) accept(picked);
          e.target.value = "";
        }}
      />

      {file ? (
        <div className="mt-[6px] flex items-center gap-3 rounded-[10px] border-[1.5px] border-line-2 bg-white p-[10px]">
          <span className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-soft-2">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local (blob:), que next/image no admite
              <img
                src={preview}
                alt="Vista previa del vehículo"
                className="h-full w-full object-cover"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-navy">
              {file.name}
            </span>
            <span className="block text-[12px] text-muted">
              {formatSize(file.size)} · se enviará al asesor
            </span>
          </span>
          <button
            type="button"
            onClick={clearPhoto}
            aria-label="Quitar foto"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[1.5px] border-line bg-white text-[#98A6BB] transition-colors hover:border-red hover:text-red"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={`mt-[6px] flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] border-dashed px-[13px] py-[11px] transition-colors ${
            dragging ? "border-red bg-red/5" : "border-line-2 bg-soft hover:border-navy"
          }`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-navy shadow-[0_0_0_1.5px_#E3E8EF_inset]">
            <ImageIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold text-navy">
              Agregar foto del vehículo
            </span>
            <span className="block text-[12px] leading-[1.4] text-muted">
              Del camión o equipo, no de la pieza. JPG, PNG o WebP de hasta
              5 MB.
            </span>
          </span>
        </label>
      )}
      {error && (
        <span role="alert" className="mt-[6px] block text-[12.5px] font-semibold text-red">
          {error}
        </span>
      )}
    </div>
  );
}
