"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "./product-card";
import type { ProductCardDTO } from "@/types/catalog";
import { cn } from "@/lib/utils";

/** Responsive product grid: 2 columns on mobile, 3 on tablet, 4 on desktop. */
export function ProductGrid({ products, className, priorityCount = 4 }: { products: ProductCardDTO[]; className?: string; priorityCount?: number }) {
  const reduce = useReducedMotion();
  return (
    <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-y-12 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <motion.li
          key={p.id}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -5% 0px" }}
          transition={{ duration: 0.5, delay: (i % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProductCard product={p} priority={i < priorityCount} />
        </motion.li>
      ))}
    </ul>
  );
}
