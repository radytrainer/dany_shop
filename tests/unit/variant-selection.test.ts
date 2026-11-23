import { describe, expect, it } from "vitest";
import {
  findVariant,
  initialSelection,
  isColorAvailable,
  isSizeAvailable,
  validateSelection,
} from "@/features/products/variant-selection";
import type { VariantDTO } from "@/types/catalog";

const v = (id: string, sizeId: string, colorId: string, available: number): VariantDTO => ({
  id,
  sku: id,
  sizeId,
  colorId,
  available,
  priceCents: 1500,
  compareAtCents: null,
});

const variants = [v("bS", "S", "black", 3), v("bM", "M", "black", 0), v("wS", "S", "white", 0), v("wM", "M", "white", 5)];

describe("variant selection", () => {
  it("never pre-selects when there is a real choice", () => {
    expect(initialSelection([{ id: "S" }, { id: "M" }], [{ id: "black" }, { id: "white" }])).toEqual({ sizeId: null, colorId: null });
  });

  it("pre-selects a single option only", () => {
    expect(initialSelection([{ id: "One" }], [{ id: "black" }, { id: "white" }])).toEqual({ sizeId: "One", colorId: null });
  });

  it("requires both size and colour", () => {
    expect(validateSelection(variants, { sizeId: null, colorId: null }, 1)).toEqual({
      ok: false,
      errors: { size: "product.chooseSizeError", color: "product.chooseColorError" },
    });
    expect(validateSelection(variants, { sizeId: "S", colorId: null }, 1)).toMatchObject({ errors: { color: "product.chooseColorError" } });
  });

  it("rejects out-of-stock combinations", () => {
    expect(validateSelection(variants, { sizeId: "M", colorId: "black" }, 1)).toMatchObject({
      ok: false,
      errors: { general: "product.variantUnavailable" },
    });
  });

  it("rejects quantities above availability", () => {
    expect(validateSelection(variants, { sizeId: "S", colorId: "black" }, 4)).toMatchObject({ ok: false, available: 3 });
  });

  it("accepts a valid in-stock selection", () => {
    const res = validateSelection(variants, { sizeId: "M", colorId: "white" }, 2);
    expect(res.ok && res.variant.id).toBe("wM");
  });

  it("computes option availability relative to the other selection", () => {
    expect(isSizeAvailable(variants, "M", "black")).toBe(false);
    expect(isSizeAvailable(variants, "M", null)).toBe(true);
    expect(isColorAvailable(variants, "white", "S")).toBe(false);
    expect(findVariant(variants, { sizeId: "S", colorId: "white" })?.id).toBe("wS");
  });
});
