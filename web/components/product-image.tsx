import Image from "next/image";
import type { Product } from "@/lib/products";
import { getProductImage } from "@/lib/products";

export function ProductImage({
  product,
  className = "object-cover",
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  product: Pick<Product, "id" | "name">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={getProductImage(product)}
      alt={product.name}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
