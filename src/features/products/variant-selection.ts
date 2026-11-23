/** Pure helpers for size/colour selection. Shared by the product page, quick view and tests. */
import type { VariantDTO } from "@/types/catalog";

export type Selection = { sizeId: string | null; colorId: string | null };

export function findVariant(variants: VariantDTO[], sel: Selection): VariantDTO | null {
  if (!sel.sizeId || !sel.colorId) return null;
  return variants.find((v) => v.sizeId === sel.sizeId && v.colorId === sel.colorId) ?? null;
}

/** A size is selectable if some variant with that size (and the chosen colour, if any) is in stock. */
export function isSizeAvailable(variants: VariantDTO[], sizeId: string, colorId: string | null): boolean {
  return variants.some((v) => v.sizeId === sizeId && (colorId === null || v.colorId === colorId) && v.available > 0);
}

export function isColorAvailable(variants: VariantDTO[], colorId: string, sizeId: string | null): boolean {
  return variants.some((v) => v.colorId === colorId && (sizeId === null || v.sizeId === sizeId) && v.available > 0);
}

/**
 * Initial selection. We never guess when there is a real choice;
 * an option is pre-selected only when it is the single option available.
 */
export function initialSelection(sizes: { id: string }[], colors: { id: string }[]): Selection {
  return {
    sizeId: sizes.length === 1 ? sizes[0].id : null,
    colorId: colors.length === 1 ? colors[0].id : null,
  };
}

export type SelectionError = "product.chooseSizeError" | "product.chooseColorError" | "product.variantUnavailable" | "product.maxQuantity";

export type SelectionResult =
  | { ok: true; variant: VariantDTO }
  | { ok: false; errors: { size?: SelectionError; color?: SelectionError; general?: SelectionError }; available?: number };

export function validateSelection(variants: VariantDTO[], sel: Selection, quantity: number): SelectionResult {
  const errors: { size?: SelectionError; color?: SelectionError; general?: SelectionError } = {};
  if (!sel.colorId) errors.color = "product.chooseColorError";
  if (!sel.sizeId) errors.size = "product.chooseSizeError";
  if (errors.size || errors.color) return { ok: false, errors };
  const variant = findVariant(variants, sel);
  if (!variant || variant.available <= 0) return { ok: false, errors: { general: "product.variantUnavailable" } };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > variant.available) {
    return { ok: false, errors: { general: "product.maxQuantity" }, available: variant.available };
  }
  return { ok: true, variant };
}
