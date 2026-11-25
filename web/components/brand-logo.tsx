import { getBrandLogo } from "@/lib/products";

export function BrandLogo({
  name,
  className = "",
  imgClassName = "",
}: {
  name: string;
  className?: string;
  imgClassName?: string;
}) {
  const logo = getBrandLogo(name);

  // Las marcas sin logo propio se muestran como texto en lugar de una imagen rota.
  // `!w-auto` anula el ancho fijo que reservan los llamadores para el logo.
  if (!logo) {
    // Centrado por defecto, salvo que el llamador fije su propia alineación.
    const justify = className.includes("justify-") ? "" : "justify-center";
    return (
      <span
        title={name}
        className={`inline-flex items-center whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-[0.06em] ${justify} ${className} !w-auto`}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      title={name}
    >
      <img
        src={logo}
        alt={name}
        loading="lazy"
        className={`block h-full w-full object-contain ${imgClassName}`}
      />
    </span>
  );
}
