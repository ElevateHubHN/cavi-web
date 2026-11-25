"use client";

/**
 * Indicador de progreso del formulario de cotización.
 * Los pasos completados se pueden pulsar para volver sin perder lo escrito.
 */

function StepCheck({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

type Props = {
  /** Etiquetas cortas, una por paso. */
  steps: string[];
  /** Paso actual, empezando en 1. */
  current: number;
  /** Volver a un paso anterior (solo se llama con pasos ya completados). */
  onSelect?: (step: number) => void;
};

export function QuoteStepper({ steps, current, onSelect }: Props) {
  return (
    <ol className="flex items-start" aria-label="Progreso de la solicitud">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        const clickable = done && !!onSelect;

        return (
          <li
            key={label}
            className="relative flex flex-1 flex-col items-center gap-[6px] text-center"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-[15px] h-[2px] w-full ${
                  done ? "bg-navy" : "bg-line"
                }`}
              />
            )}

            <button
              type="button"
              disabled={!clickable}
              onClick={clickable && onSelect ? () => onSelect(step) : undefined}
              aria-current={active ? "step" : undefined}
              aria-label={`Paso ${step}: ${label}`}
              className={`relative z-[1] grid h-8 w-8 place-items-center rounded-full border-2 text-[12.5px] font-extrabold transition-colors ${
                done
                  ? "border-navy bg-navy text-white"
                  : active
                    ? "border-red bg-red text-white ring-4 ring-red/15"
                    : "border-line bg-white text-muted-3"
              } ${clickable ? "cursor-pointer hover:border-red hover:bg-red" : "cursor-default"}`}
            >
              {done ? <StepCheck /> : step}
            </button>

            <span
              className={`relative z-[1] text-[11.5px] leading-[1.25] ${
                active
                  ? "font-bold text-navy"
                  : done
                    ? "font-semibold text-ink-2"
                    : "text-muted-3"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
