import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Wipe the integration-test database. Refuses to run against anything that isn't a test DB. */
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) throw new Error(`Refusing to wipe non-test database: ${url}`);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
}

export type Fixtures = Awaited<ReturnType<typeof seedFixtures>>;

export async function seedFixtures() {
  await prisma.storeSettings.create({
    data: { id: "default", storeName: "TEST", telegramUsername: "test_seller", whatsappNumber: "85512345678", reservationHours: 48, deductStockOn: "CONFIRMED" },
  });
  const women = await prisma.category.create({ data: { slug: "women", name: "Women" } });
  const dresses = await prisma.category.create({ data: { slug: "women-dresses", name: "Dresses", parentId: women.id } });
  const [s, m] = await Promise.all([prisma.size.create({ data: { name: "S", sortOrder: 0 } }), prisma.size.create({ data: { name: "M", sortOrder: 1 } })]);
  const black = await prisma.color.create({ data: { name: "Black", hex: "#000000" } });
  const product = await prisma.product.create({
    data: {
      slug: "test-dress",
      sku: "T-DRESS",
      name: "Test Dress",
      description: "A dress",
      categoryId: dresses.id,
      price: "25.00",
      salePrice: "20.00",
      sortPrice: "20.00",
      status: "ACTIVE",
      variants: {
        create: [
          { sku: "T-DRESS-BLK-S", sizeId: s.id, colorId: black.id, stock: 2 },
          { sku: "T-DRESS-BLK-M", sizeId: m.id, colorId: black.id, stock: 10 },
        ],
      },
    },
    include: { variants: true },
  });
  const draft = await prisma.product.create({
    data: { slug: "draft-item", sku: "T-DRAFT", name: "Hidden Draft", description: "x", categoryId: dresses.id, price: "10", sortPrice: "10", status: "DRAFT" },
  });
  const delivery = await prisma.deliveryMethod.create({ data: { name: "Phnom Penh", fee: "2.00", freeOverAmount: "100.00" } });
  const coupon = await prisma.coupon.create({ data: { code: "SAVE5", type: "FIXED", value: "5", usageLimit: 1 } });
  const expired = await prisma.coupon.create({ data: { code: "OLD10", type: "PERCENTAGE", value: "10", expiresAt: new Date("2020-01-01") } });
  const hash = await bcrypt.hash("Password123", 4);
  const admin = await prisma.user.create({ data: { email: "admin@test.local", name: "Admin", role: "ADMIN", passwordHash: hash } });
  const staff = await prisma.user.create({ data: { email: "staff@test.local", name: "Staff", role: "STAFF", passwordHash: hash } });
  const customer = await prisma.user.create({ data: { email: "cust@test.local", name: "Cust", role: "CUSTOMER", passwordHash: hash } });
  const small = product.variants.find((v) => v.sku.endsWith("-S"))!;
  const medium = product.variants.find((v) => v.sku.endsWith("-M"))!;
  return { women, dresses, product, draft, small, medium, delivery, coupon, expired, admin, staff, customer };
}

export const customer = {
  fullName: "Test Customer",
  phone: "012 345 678",
  province: "Phnom Penh",
  district: "Chamkarmon",
  commune: "Tonle Bassac",
  addressLine: "No. 1, Street 1",
};
