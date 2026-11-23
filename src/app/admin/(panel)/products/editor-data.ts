import "server-only";
import { prisma } from "@/lib/prisma";

/** Reference data for the product editor. */
export async function getEditorOptions() {
  const [categories, sizes, colors, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { parent: { select: { name: true } }, _count: { select: { children: true } } } }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.color.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    categories: categories
      .map((c) => ({ id: c.id, label: c.parent ? `${c.parent.name} / ${c.name}` : c.name, isLeaf: c._count.children === 0 }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    sizes: sizes.map((s) => ({ id: s.id, name: s.name })),
    colors: colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
    collections,
  };
}
export type EditorOptions = Awaited<ReturnType<typeof getEditorOptions>>;
