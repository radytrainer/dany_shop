import "server-only";
import { prisma } from "@/lib/prisma";

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const wl = await prisma.wishlist.findUnique({
    where: { userId },
    include: { items: { orderBy: { createdAt: "desc" }, select: { productId: true } } },
  });
  return wl?.items.map((i) => i.productId) ?? [];
}

/** Add products (ignores unknown ids and duplicates). Returns the full list. */
export async function addToWishlist(userId: string, productIds: string[]): Promise<string[]> {
  if (productIds.length) {
    const valid = await prisma.product.findMany({ where: { id: { in: productIds.slice(0, 200) } }, select: { id: true } });
    const wl = await prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
    if (valid.length) {
      await prisma.wishlistItem.createMany({
        data: valid.map((p) => ({ wishlistId: wl.id, productId: p.id })),
        skipDuplicates: true,
      });
    }
  }
  return getWishlistProductIds(userId);
}

export async function removeFromWishlist(userId: string, productId: string) {
  const wl = await prisma.wishlist.findUnique({ where: { userId } });
  if (!wl) return;
  await prisma.wishlistItem.deleteMany({ where: { wishlistId: wl.id, productId } });
}
