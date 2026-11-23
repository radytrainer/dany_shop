/** Serializable catalog DTOs shared between server services and client components. */

export const ITEM_CONDITIONS = ["NEW_WITH_TAGS", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"] as const;
export type ItemConditionKey = (typeof ITEM_CONDITIONS)[number];

/** name = canonical value (used in filters/orders); label = display name in the active language. */
export type ColorSwatch = { id: string; name: string; hex: string; label?: string };
export type SizeOption = { id: string; name: string; label?: string };

export type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  hoverImageUrl: string | null;
  priceCents: number;
  compareAtCents: number | null;
  discountPercent: number | null;
  currency: string;
  isNew: boolean;
  /** Second-hand grade (null for new stock). */
  condition: ItemConditionKey | null;
  inStock: boolean;
  colors: ColorSwatch[];
};

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  parentId: string | null;
  isFeatured: boolean;
  children: CategoryNode[];
};

export type VariantDTO = {
  id: string;
  sku: string;
  sizeId: string;
  colorId: string;
  available: number;
  priceCents: number;
  compareAtCents: number | null;
};

export type ProductImageDTO = { id: string; url: string; alt: string | null; colorId: string | null };

export type ProductDetailDTO = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  description: string;
  brand: string | null;
  tags: string[];
  currency: string;
  isNew: boolean;
  condition: ItemConditionKey | null;
  priceCents: number;
  compareAtCents: number | null;
  images: ProductImageDTO[];
  sizes: SizeOption[];
  colors: ColorSwatch[];
  variants: VariantDTO[];
  lowStockThreshold: number;
  category: { id: string; slug: string; name: string };
  breadcrumbs: { slug: string; name: string }[];
};

export type ListingFacets = {
  sizes: SizeOption[];
  colors: ColorSwatch[];
  brands: string[];
  priceMin: number;
  priceMax: number;
};

export type SortKey = "newest" | "price_asc" | "price_desc" | "popular" | "best";
export const SORT_KEYS: SortKey[] = ["newest", "price_asc", "price_desc", "popular", "best"];
