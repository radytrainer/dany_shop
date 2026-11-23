/**
 * Database seed.
 *  - Reference data (sizes, colors, categories, delivery methods, settings, admin) is always seeded.
 *  - Demo catalog (products, banners, collections, coupons, demo customer) is seeded ONLY when
 *    NODE_ENV !== "production" or SEED_DEMO=true. Never ship demo products to production.
 * Idempotent: safe to run repeatedly.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedKhmerDemoContent, seedOptionTranslations } from "./seed-khmer";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const SEED_DEMO = process.env.SEED_DEMO === "true" || process.env.NODE_ENV !== "production";

const img = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Verified development images (checked visually for subject accuracy).
const I = {
  yellowSet: "1515886657613-9f3515b0c78f",
  rackWhite: "1490481651871-ab68de25d43d",
  burgundyCoat: "1483985988355-763728e1935b",
  storeInterior: "1441984904996-e0b6ba687e04",
  whiteTee: "1521572163474-6864f9cf17ab",
  skeletonTee: "1503341504253-dff4815485f1",
  dotShirt: "1596755094514-f87e34085b2c",
  mensShirts: "1602810318383-e386cc2a3ccf",
  redMaxi: "1595777457583-95e059d581b8",
  wrapDress: "1539008835657-9e8e9680c956",
  floralRed: "1572804013309-59a88b7e92f1",
  poncho: "1434389677669-e08b4cac3105",
  hoodie: "1556821840-3a63f95609a7",
  jeansStack: "1542272604-787c3835535d",
  rippedJeans: "1541099649105-f69ad21f3246",
  leatherJacket: "1551028719-00167b16eac5",
  bomber: "1591047139829-d91aecb6caea",
  pinkJogger: "1594633312681-425c7b97ccd1",
  darkJeans: "1624378439575-d8705ad7ae80",
  denimShorts: "1591195853828-11db59a44f6b",
  manWhiteTee: "1586790170083-2f9ceadc732d",
  redBag: "1584917865442-de89df76afd3",
  cap: "1521369909029-2afed882baee",
  strawHat: "1572307480813-ceb0e59d8325",
  watch: "1524592094714-0f0654e20314",
  stripedTrousers: "1509631179647-0177331693ae",
  sunglasses: "1469334031218-e382a71b716b",
  manLeather: "1487222477894-8943e31ef7b2",
  floralDress: "1496747611176-843222e1e57c",
  navySuit: "1617137968427-85924c800a22",
  suitDetail: "1507679799987-c73779587ccf",
  blueTee: "1564584217132-2271feaeb3c5",
  skirt: "1583496661160-fb5886a0aaaa",
  floralTop: "1564257631407-4deb1f99d992",
  blackTee: "1618354691373-d851c5c3a990",
  navyTee: "1622519407650-3df9883f76a5",
  flatlayJeans: "1525507119028-ed4c629a60a3",
  pinkCoat: "1485462537746-965f33f7f6a7",
  rackNeutral: "1512436991641-6745cdb1723f",
  storeRacks: "1445205170230-053b83016050",
  oxford: "1558171813-4c088753af8f",
  knitSweater: "1475180098004-ca77a66827be",
  manLeather2: "1520975954732-35dd22299614",
  flatlayKnit: "1516762689617-e1cffcef479d",
  flatlayChino: "1544441893-675973e31985",
  foldedTees: "1562157873-818bc0726f68",
  rackMinimal: "1551232864-3f0890e580d9",
  corduroyDress: "1585487000160-6ebcfceb0d03",
  blazer: "1608234808654-2a8875faa7fd",
  denimJacket: "1611312449408-fcece27cdbb7",
  sweatshirt: "1620799140408-edc6dcb6d633",
  printTee: "1627225924765-552d49cf47ad",
  straightJeans: "1598554747436-c9293d6a588f",
  backpack: "1553062407-98eeb64c6a62",
  basketBag: "1590874103328-eac38a683ce7",
  graphicTee: "1576566588028-4147f3842f27",
  greenTees: "1523381210434-271e8be1f52b",
} as const;

// ───────────────────────────── Reference data ─────────────────────────────

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "One Size"];
const COLORS: [string, string][] = [
  ["Black", "#171717"], ["White", "#FFFFFF"], ["Cream", "#F3EDE2"], ["Beige", "#D9C8B0"],
  ["Camel", "#A67C52"], ["Brown", "#6B4A35"], ["Grey", "#9CA3AF"], ["Navy", "#1F2A44"],
  ["Blue", "#8FA9C4"], ["Denim", "#4A6378"], ["Red", "#B42318"], ["Burgundy", "#6D1F2F"],
  ["Pink", "#E8C4C0"], ["Olive", "#6B6B47"], ["Orange", "#D9824B"],
];

type CatSeed = { slug: string; name: string; km: string; children?: [string, string, string][]; image?: string; banner?: string; description?: string; isActive?: boolean };
const CATEGORIES: CatSeed[] = [
  {
    slug: "women", name: "Women", km: "នារី", image: img(I.redMaxi, 900), banner: img(I.floralDress, 2000),
    description: "Considered essentials and statement pieces for every day of the week.",
    children: [
      ["women-dresses", "Dresses", "រ៉ូប"], ["women-tops", "Tops", "អាវស្តើង"], ["women-t-shirts", "T-Shirts", "អាវយឺត"],
      ["women-shirts", "Shirts", "អាវសឺមី"], ["women-skirts", "Skirts", "សំពត់"], ["women-pants", "Pants", "ខោ"],
      ["women-jeans", "Jeans", "ខោខូវប៊យ"], ["women-jackets", "Jackets", "អាវក្រៅ"], ["women-sweaters", "Sweaters", "អាវរងារ"],
    ],
  },
  {
    slug: "men", name: "Men", km: "បុរស", image: img(I.navySuit, 900), banner: img(I.manLeather, 2000),
    description: "Clean lines, honest fabrics and easy tailoring.",
    children: [
      ["men-t-shirts", "T-Shirts", "អាវយឺត"], ["men-shirts", "Shirts", "អាវសឺមី"], ["men-polo-shirts", "Polo Shirts", "អាវប៉ូឡូ"],
      ["men-pants", "Pants", "ខោ"], ["men-jeans", "Jeans", "ខោខូវប៊យ"], ["men-shorts", "Shorts", "ខោខ្លី"],
      ["men-jackets", "Jackets", "អាវក្រៅ"], ["men-hoodies", "Hoodies", "អាវមានមួក"],
    ],
  },
  {
    slug: "second-hand", name: "Second Hand", km: "សម្លៀកបំពាក់មួយទឹក", image: img(I.rackMinimal, 900), banner: img(I.storeRacks, 2000),
    description: "Pre-loved pieces, checked and graded by us. One of a kind — when it's gone, it's gone.",
    children: [
      ["second-hand-women", "Women", "នារី"], ["second-hand-men", "Men", "បុរស"],
    ],
  },
  {
    // Hidden from the storefront (re-activate in Admin → Categories).
    isActive: false,
    slug: "accessories", name: "Accessories", km: "គ្រឿងតុបតែង", image: img(I.redBag, 900), banner: img(I.basketBag, 2000),
    description: "The finishing touches: bags, hats, eyewear and more.",
    children: [
      ["bags", "Bags", "កាបូប"], ["hats", "Hats", "មួក"], ["belts", "Belts", "ខ្សែក្រវ៉ាត់"],
      ["sunglasses", "Sunglasses", "វ៉ែនតាការពារពន្លឺ"], ["watches", "Watches", "នាឡិកា"], ["other-accessories", "Other Accessories", "គ្រឿងតុបតែងផ្សេងៗ"],
    ],
  },
];

async function seedReference() {
  for (const [i, name] of SIZES.entries()) {
    await prisma.size.upsert({ where: { name }, update: { sortOrder: i }, create: { name, sortOrder: i } });
  }
  for (const [i, [name, hex]] of COLORS.entries()) {
    await prisma.color.upsert({ where: { name }, update: { hex, sortOrder: i }, create: { name, hex, sortOrder: i } });
  }

  for (const [i, cat] of CATEGORIES.entries()) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug, name: cat.name, sortOrder: i, isFeatured: true, description: cat.description, isActive: cat.isActive ?? true,
        imageUrl: SEED_DEMO ? cat.image : null, bannerUrl: SEED_DEMO ? cat.banner : null,
      },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: parent.id, locale: "km" } },
      update: {},
      create: { categoryId: parent.id, locale: "km", name: cat.km },
    });
    for (const [j, [slug, name, km]] of (cat.children ?? []).entries()) {
      const child = await prisma.category.upsert({
        where: { slug },
        update: {},
        create: { slug, name, parentId: parent.id, sortOrder: j },
      });
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: child.id, locale: "km" } },
        update: {},
        create: { categoryId: child.id, locale: "km", name: km },
      });
    }
  }

  const deliveries = [
    { name: "Siem Reap delivery", fee: "1.50", estimatedDays: "Same or next day", freeOverAmount: "50.00", km: "ដឹកជញ្ជូនក្នុងខេត្តសៀមរាប", sortOrder: 0, isPickup: false },
    { name: "Other provinces", fee: "3.00", estimatedDays: "2–4 days", freeOverAmount: null, km: "ដឹកជញ្ជូនទៅខេត្តផ្សេងៗ", sortOrder: 1, isPickup: false },
    { name: "Store pickup (Siem Reap)", fee: "0.00", estimatedDays: "Ready in 24 hours", freeOverAmount: null, km: "មកយកនៅហាង (សៀមរាប)", sortOrder: 2, isPickup: true },
  ];
  if ((await prisma.deliveryMethod.count()) === 0) {
    for (const d of deliveries) {
      await prisma.deliveryMethod.create({
        data: {
          name: d.name, fee: d.fee, estimatedDays: d.estimatedDays, freeOverAmount: d.freeOverAmount,
          sortOrder: d.sortOrder, isPickup: d.isPickup, translations: { km: { name: d.km } },
        },
      });
    }
  }

  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "DANY",
      logoUrl: "/brand/logo-black.png",
      showCollections: false,
      tagline: "Modern essentials, thoughtfully made.",
      currency: "USD",
      khrExchangeRate: "4100",
      showKhrEquivalent: true,
      // Placeholders — configure the real accounts in Admin → Settings.
      telegramUsername: SEED_DEMO ? "dany_shop_demo" : null,
      whatsappNumber: SEED_DEMO ? "85512345678" : null,
      messengerUrl: SEED_DEMO ? "https://m.me/danyshopdemo" : null,
      defaultChannel: "TELEGRAM",
      contactEmail: "hello@dany.shop",
      contactPhone: "+855 12 345 678",
      address: "Siem Reap, Cambodia",
      socialLinks: { instagram: "https://instagram.com/", facebook: "https://facebook.com/", tiktok: "https://tiktok.com/", telegram: "https://t.me/" },
      footerText: "Modern essentials from Siem Reap.",
      shippingInfo:
        "Siem Reap: same or next-day delivery ($1.50, free over $50).\nOther provinces: 2–4 days ($3.00).\nStore pickup in Siem Reap is free.\nExchanges within 7 days for unworn items with tags attached.",
      sizeGuide:
        "Size | Chest (cm) | Waist (cm) | Hip (cm)\nXS | 80–84 | 62–66 | 86–90\nS | 84–88 | 66–70 | 90–94\nM | 88–94 | 70–76 | 94–100\nL | 94–100 | 76–82 | 100–106\nXL | 100–106 | 82–88 | 106–112\nXXL | 106–112 | 88–94 | 112–118",
      announcementActive: true,
      announcementText: "Free delivery in Siem Reap on orders over $50",
      announcementHref: "/shop",
      translations: {
        km: {
          tagline: "សម្លៀកបំពាក់ទំនើប រចនាដោយយកចិត្តទុកដាក់។",
          announcementText: "ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងខេត្តសៀមរាប សម្រាប់ការកម្ម៉ង់លើសពី $50",
          footerText: "សម្លៀកបំពាក់ទំនើប ពីខេត្តសៀមរាប។",
        },
      },
      homepageSections: [
        "hero", "categories", "newArrivals", "promo", "bestSellers", "trending", "offers", "editorial", "newsletter", "social",
      ].map((key) => ({ key, enabled: true })),
      socialGallery: SEED_DEMO
        ? [I.flatlayKnit, I.flatlayJeans, I.stripedTrousers, I.yellowSet, I.manLeather, I.knitSweater].map((id) => ({
            imageUrl: img(id, 600),
            href: "https://instagram.com/",
          }))
        : [],
    },
  });

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 10) throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters");
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      await prisma.user.create({
        data: { email: adminEmail, name: "Store Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12) },
      });
      console.log(`  admin created: ${adminEmail}`);
    }
  } else {
    console.warn("  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin user created");
  }
}

// ───────────────────────────── Demo catalog ─────────────────────────────

type ProductSeed = {
  name: string; cat: string; price: string; sale?: string; images: string[]; colors: string[]; sizes: string[];
  flags?: ("featured" | "new" | "best")[]; tags: string[]; brand?: string; short: string; km?: string;
  /** Second-hand grade; such items are one-of-a-kind (stock 1). */
  condition?: "NEW_WITH_TAGS" | "LIKE_NEW" | "EXCELLENT" | "GOOD" | "FAIR";
};

const APPAREL = ["XS", "S", "M", "L", "XL"];
const MENS = ["S", "M", "L", "XL", "XXL"];
const WAIST = ["28", "30", "32", "34", "36"];
const ONE = ["One Size"];

const PRODUCTS: ProductSeed[] = [
  { name: "Flowing Maxi Dress", cat: "women-dresses", price: "48", sale: "39", images: [I.redMaxi], colors: ["Red", "Black"], sizes: APPAREL, flags: ["featured", "new"], tags: ["dress", "maxi", "summer"], short: "A floor-sweeping maxi in fluid crepe that moves with you.", km: "រ៉ូបវែងហោះហើរ" },
  { name: "Wrap Linen Dress", cat: "women-dresses", price: "55", images: [I.wrapDress], colors: ["Blue", "Cream"], sizes: APPAREL, flags: ["best", "featured"], tags: ["dress", "linen", "summer"], short: "Breathable linen wrap dress with a tie waist and side slit." },
  { name: "Floral Midi Dress", cat: "women-dresses", price: "42", images: [I.floralRed, I.floralDress], colors: ["Red", "Cream"], sizes: APPAREL, flags: ["new"], tags: ["dress", "floral", "summer"], short: "Fit-and-flare midi in a hand-drawn floral print." },
  { name: "Corduroy Shirt Dress", cat: "women-dresses", price: "58", images: [I.corduroyDress], colors: ["Burgundy"], sizes: APPAREL, tags: ["dress", "corduroy", "winter"], short: "Fine-wale corduroy shirt dress with a gathered skirt." },
  { name: "Embroidered Crop Blouse", cat: "women-tops", price: "29", images: [I.floralTop], colors: ["White"], sizes: APPAREL, flags: ["new"], tags: ["top", "blouse", "summer"], short: "Lightweight cotton blouse with tonal floral embroidery." },
  { name: "Relaxed Cotton Tee", cat: "women-t-shirts", price: "15", images: [I.blueTee], colors: ["Blue", "White", "Black"], sizes: APPAREL, flags: ["best"], tags: ["t-shirt", "basics", "cotton"], short: "Our softest everyday tee in combed organic cotton." },
  { name: "Chambray Dot Shirt", cat: "women-shirts", price: "32", images: [I.dotShirt], colors: ["Denim"], sizes: APPAREL, tags: ["shirt", "chambray"], short: "Three-quarter sleeve chambray shirt with a micro-dot print." },
  { name: "Pleated Mini Skirt", cat: "women-skirts", price: "28", images: [I.skirt], colors: ["Black"], sizes: APPAREL, flags: ["best"], tags: ["skirt", "pleated"], short: "Crisp pleated mini skirt with a concealed side zip." },
  { name: "Wide-Leg Striped Trousers", cat: "women-pants", price: "45", images: [I.stripedTrousers], colors: ["Black"], sizes: APPAREL, flags: ["new"], tags: ["pants", "wide-leg", "trending"], short: "High-waisted wide-leg trousers in a bold pinstripe." },
  { name: "Soft Jogger Pants", cat: "women-pants", price: "35", sale: "28", images: [I.pinkJogger], colors: ["Pink", "Beige"], sizes: APPAREL, tags: ["pants", "jogger", "lounge"], short: "Satin-touch joggers with elastic cuffs and deep pockets." },
  { name: "High-Rise Straight Jeans", cat: "women-jeans", price: "49", images: [I.straightJeans], colors: ["Denim"], sizes: WAIST, flags: ["best"], tags: ["jeans", "denim", "straight"], short: "Rigid high-rise denim with a straight, ankle-grazing leg." },
  { name: "Distressed Boyfriend Jeans", cat: "women-jeans", price: "45", sale: "36", images: [I.rippedJeans], colors: ["Denim"], sizes: WAIST, tags: ["jeans", "denim", "distressed"], short: "Relaxed boyfriend jeans with hand-finished distressing." },
  { name: "Wool Blend Coat", cat: "women-jackets", price: "120", sale: "96", images: [I.pinkCoat, I.burgundyCoat], colors: ["Pink", "Burgundy"], sizes: APPAREL, flags: ["featured"], tags: ["coat", "wool", "winter"], short: "Double-faced wool blend coat with dropped shoulders." },
  { name: "Check Tailored Blazer", cat: "women-jackets", price: "89", images: [I.blazer], colors: ["Grey"], sizes: APPAREL, flags: ["new", "featured"], tags: ["blazer", "tailoring"], short: "Oversized single-breasted blazer in a Prince of Wales check." },
  { name: "Chunky Knit Sweater", cat: "women-sweaters", price: "52", images: [I.knitSweater], colors: ["Cream", "Brown"], sizes: APPAREL, tags: ["sweater", "knit", "winter"], short: "Graphic intarsia knit in a soft wool-cotton blend." },
  { name: "Fringe Knit Poncho", cat: "women-sweaters", price: "39", images: [I.poncho], colors: ["Cream"], sizes: ONE, tags: ["poncho", "knit"], short: "Open-knit poncho with hand-tied fringe trim." },
  { name: "Premium Oversized T-Shirt", cat: "men-t-shirts", price: "15", images: [I.whiteTee, I.foldedTees, I.manWhiteTee], colors: ["Black", "White", "Beige"], sizes: MENS, flags: ["featured", "best"], tags: ["t-shirt", "oversized", "basics", "cotton"], short: "Heavyweight 240gsm cotton tee with a relaxed, boxy fit.", km: "អាវយឺតធំទំហំពិសេស" },
  { name: "Graphic Skeleton Tee", cat: "men-t-shirts", price: "19", images: [I.skeletonTee], colors: ["Black"], sizes: MENS, tags: ["t-shirt", "graphic", "trending"], short: "Washed black tee with a hand-drawn front graphic." },
  { name: "Cotton Print Tee", cat: "men-t-shirts", price: "18", images: [I.printTee], colors: ["White"], sizes: MENS, flags: ["new"], tags: ["t-shirt", "print"], short: "Crisp white tee with a minimal chest print." },
  { name: "Oxford Cotton Shirt", cat: "men-shirts", price: "35", images: [I.oxford], colors: ["Blue", "White"], sizes: MENS, flags: ["best"], tags: ["shirt", "oxford"], short: "Button-down Oxford shirt, garment washed for softness." },
  { name: "Casual Shirt", cat: "men-shirts", price: "22", images: [I.mensShirts], colors: ["White", "Burgundy", "Grey"], sizes: MENS, tags: ["shirt", "casual"], short: "Easy-care poplin shirt with a classic collar." },
  { name: "Piqué Polo Shirt", cat: "men-polo-shirts", price: "25", images: [I.navyTee], colors: ["Navy", "Black"], sizes: MENS, tags: ["polo", "piqué"], short: "Fine cotton piqué polo with contrast tipping." },
  { name: "Tailored Chino Pants", cat: "men-pants", price: "39", images: [I.flatlayChino], colors: ["Grey", "Navy"], sizes: WAIST, tags: ["pants", "chino"], short: "Slim-tapered chinos in stretch cotton twill." },
  { name: "Slim Dark Jeans", cat: "men-jeans", price: "45", images: [I.darkJeans, I.jeansStack], colors: ["Denim", "Black"], sizes: WAIST, flags: ["best"], tags: ["jeans", "denim", "slim"], short: "Clean dark-wash jeans with a slim, straight leg." },
  { name: "Washed Denim Shorts", cat: "men-shorts", price: "25", images: [I.denimShorts], colors: ["Denim"], sizes: ["28", "30", "32", "34"], flags: ["new"], tags: ["shorts", "denim", "summer"], short: "Light-wash denim shorts with a rolled hem." },
  { name: "Leather Biker Jacket", cat: "men-jackets", price: "145", sale: "119", images: [I.leatherJacket, I.manLeather2], colors: ["Black"], sizes: MENS, flags: ["featured"], tags: ["jacket", "leather", "trending"], short: "Supple lambskin biker jacket with asymmetric zip." },
  { name: "Suede Bomber Jacket", cat: "men-jackets", price: "98", images: [I.bomber], colors: ["Camel"], sizes: MENS, tags: ["jacket", "bomber"], short: "Lightweight bomber in a brushed suede-effect fabric." },
  { name: "Trucker Denim Jacket", cat: "men-jackets", price: "75", images: [I.denimJacket], colors: ["Denim"], sizes: MENS, flags: ["new"], tags: ["jacket", "denim"], short: "Rinse-wash trucker jacket with a corduroy collar." },
  { name: "Tailored Suit Jacket", cat: "men-jackets", price: "159", images: [I.navySuit, I.suitDetail], colors: ["Navy"], sizes: MENS, flags: ["featured"], tags: ["suit", "tailoring"], short: "Half-canvassed suit jacket in Italian wool." },
  { name: "Classic Pullover Hoodie", cat: "men-hoodies", price: "38", images: [I.hoodie], colors: ["Grey", "Black"], sizes: MENS, flags: ["best"], tags: ["hoodie", "fleece", "winter"], short: "Brushed-back fleece hoodie with a double-layer hood." },
  { name: "Heavyweight Sweatshirt", cat: "men-hoodies", price: "34", images: [I.sweatshirt], colors: ["White", "Grey"], sizes: MENS, tags: ["sweatshirt", "basics"], short: "Loopback cotton crewneck with ribbed trims." },
  { name: "Structured Top-Handle Bag", cat: "bags", price: "85", images: [I.redBag], colors: ["Red", "Black"], sizes: ONE, tags: ["bag", "leather"], short: "Polished leather top-handle bag with detachable strap." },
  { name: "Woven Basket Bag", cat: "bags", price: "69", images: [I.basketBag], colors: ["Orange"], sizes: ONE, flags: ["new"], tags: ["bag", "summer", "woven"], short: "Hand-woven rattan bag with leather trims." },
  { name: "Everyday Backpack", cat: "bags", price: "49", images: [I.backpack], colors: ["Navy"], sizes: ONE, tags: ["bag", "backpack"], short: "Water-resistant backpack with a padded laptop sleeve." },
  { name: "Washed Cotton Cap", cat: "hats", price: "15", images: [I.cap], colors: ["Grey", "Black"], sizes: ONE, tags: ["hat", "cap"], short: "Six-panel cotton cap with an adjustable strap." },
  { name: "Straw Sun Hat", cat: "hats", price: "24", images: [I.strawHat], colors: ["Beige"], sizes: ONE, tags: ["hat", "summer"], short: "Wide-brim straw hat with a ribbon band." },
  { name: "Round Sunglasses", cat: "sunglasses", price: "29", images: [I.sunglasses], colors: ["Black"], sizes: ONE, tags: ["sunglasses", "summer", "trending"], short: "Retro round frames with UV400 lenses." },
  { name: "Minimal Leather Watch", cat: "watches", price: "79", images: [I.watch], colors: ["Brown"], sizes: ONE, tags: ["watch", "leather"], short: "Clean-dial quartz watch on a vegetable-tanned strap." },
  // Second hand — pre-loved, one of a kind
  { name: "Vintage Graphic Tee", cat: "second-hand-men", price: "8", images: [I.graphicTee], colors: ["Beige"], sizes: ["L"], flags: ["new"], tags: ["second-hand", "vintage", "t-shirt"], brand: "Pre-loved", short: "Soft, broken-in cotton tee with a retro front print. Light fading, no holes or stains.", condition: "GOOD" },
  { name: "Vintage Washed Tee", cat: "second-hand-men", price: "7", images: [I.greenTees], colors: ["Olive"], sizes: ["M"], tags: ["second-hand", "vintage", "t-shirt"], brand: "Pre-loved", short: "Garment-dyed tee with a lived-in wash. Gently worn, great condition.", condition: "EXCELLENT" },
  { name: "Pre-loved Straight Jeans", cat: "second-hand-women", price: "12", images: [I.flatlayJeans], colors: ["Denim"], sizes: ["28"], flags: ["new"], tags: ["second-hand", "jeans", "denim"], brand: "Pre-loved", short: "Classic mid-wash straight jeans, worn twice. No visible wear.", condition: "LIKE_NEW" },
  { name: "Pre-loved Cream Knit", cat: "second-hand-women", price: "10", images: [I.flatlayKnit], colors: ["Cream"], sizes: ["M"], tags: ["second-hand", "knit", "sweater"], brand: "Pre-loved", short: "Chunky cream knit, freshly laundered. Slight softening of the yarn from wear.", condition: "GOOD" },
  { name: "Vintage Linen Blouse", cat: "second-hand-women", price: "9", images: [I.rackWhite], colors: ["White"], sizes: ["S"], tags: ["second-hand", "vintage", "blouse", "linen"], brand: "Pre-loved", short: "Airy white linen blouse with original tags still attached.", condition: "NEW_WITH_TAGS" },
];

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-");

// Deterministic pseudo-random stock so the demo has in-stock, low-stock and sold-out variants.
let seedState = 42;
const rand = () => ((seedState = (seedState * 1103515245 + 12345) % 2147483648) / 2147483648);

async function seedDemo() {
  const sizes = new Map((await prisma.size.findMany()).map((s) => [s.name, s.id]));
  const colors = new Map((await prisma.color.findMany()).map((c) => [c.name, c.id]));
  const cats = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  const now = Date.now();
  for (const [index, p] of PRODUCTS.entries()) {
    const slug = slugify(p.name);
    const sku = `DN-${String(index + 1).padStart(4, "0")}`;
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) continue;
    const categoryId = cats.get(p.cat);
    if (!categoryId) throw new Error(`Unknown category ${p.cat}`);
    const flags = new Set(p.flags ?? []);
    const createdAt = new Date(now - (PRODUCTS.length - index) * 36 * 3600 * 1000);

    const product = await prisma.product.create({
      data: {
        slug, sku, name: p.name, shortDescription: p.short,
        description: p.condition
          ? `${p.short}\n\nEvery pre-loved piece is checked, cleaned and graded by our team before it goes online. Any wear is described above and shown in the photos.\n\n• One of a kind — only one available\n• Measured flat; check the size guide\n• Exchanges are not available for second-hand items`
          : `${p.short}\n\nDesigned for everyday wear and made to last. Cut from carefully sourced materials and finished with attention to detail.\n\n• Regular fit — choose your usual size\n• Machine wash cold, dry flat\n• Model is 175 cm and wears size M`,
        categoryId, brand: p.brand ?? "DANY", price: p.price, salePrice: p.sale ?? null, sortPrice: p.sale ?? p.price, status: "ACTIVE",
        isFeatured: flags.has("featured"), isNewArrival: flags.has("new"), isBestSeller: flags.has("best"),
        condition: p.condition ?? null,
        tags: p.tags, soldCount: Math.floor(rand() * 120), viewCount: Math.floor(rand() * 2000),
        publishedAt: createdAt, createdAt,
        images: { create: p.images.map((id, i) => ({ url: img(id), alt: p.name, sortOrder: i, isFeatured: i === 0 })) },
        translations: p.km ? { create: [{ locale: "km", name: p.km }] } : undefined,
      },
    });

    for (const color of p.colors) {
      for (const size of p.sizes) {
        const r = rand();
        const stock = p.condition ? 1 : r < 0.1 ? 0 : r < 0.22 ? 2 : 5 + Math.floor(rand() * 25);
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `${sku}-${color.slice(0, 3).toUpperCase()}-${size.replace(/\s+/g, "").toUpperCase()}`,
            sizeId: sizes.get(size)!, colorId: colors.get(color)!, stock,
          },
        });
        if (stock > 0) {
          await prisma.inventoryMovement.create({
            data: { variantId: variant.id, type: "INITIAL", stockDelta: stock, stockAfter: stock, reservedAfter: 0, reason: "Initial stock (seed)" },
          });
        }
      }
    }
  }

  // Collections
  const bySlug = async (slugs: string[]) =>
    (await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })).sort(
      (a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug),
    );
  const collections = [
    { slug: "summer-collection", name: "Summer Collection", km: "ការប្រមូលផ្តុំរដូវក្តៅ", image: I.wrapDress, banner: I.floralDress, featured: true,
      description: "Linen, light cotton and sun-ready accessories for long, warm days.",
      products: ["wrap-linen-dress", "floral-midi-dress", "flowing-maxi-dress", "embroidered-crop-blouse", "washed-denim-shorts", "straw-sun-hat", "woven-basket-bag", "round-sunglasses"] },
    { slug: "winter-collection", name: "Winter Collection", km: "ការប្រមូលផ្តុំរដូវរងា", image: I.burgundyCoat, banner: I.pinkCoat, featured: true,
      description: "Wool coats, chunky knits and layers for cooler evenings.",
      products: ["wool-blend-coat", "chunky-knit-sweater", "corduroy-shirt-dress", "classic-pullover-hoodie", "leather-biker-jacket", "heavyweight-sweatshirt"] },
    { slug: "the-tailoring-edit", name: "The Tailoring Edit", km: "ការរចនាតាមខ្នាត", image: I.navySuit, banner: I.suitDetail, featured: true,
      description: "Sharp blazers and trousers that work from desk to dinner.",
      products: ["tailored-suit-jacket", "check-tailored-blazer", "tailored-chino-pants", "oxford-cotton-shirt", "wide-leg-striped-trousers"] },
  ];
  for (const [i, c] of collections.entries()) {
    const existing = await prisma.collection.findUnique({ where: { slug: c.slug } });
    if (existing) continue;
    const products = await bySlug(c.products);
    await prisma.collection.create({
      data: {
        slug: c.slug, name: c.name, description: c.description, imageUrl: img(c.image, 1000), bannerUrl: img(c.banner, 2000),
        isFeatured: c.featured, sortOrder: i, translations: { km: { name: c.km } },
        products: { create: products.map((p, j) => ({ productId: p.id, sortOrder: j })) },
      },
    });
  }

  // Banners
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        { placement: "HERO", title: "The New Season Edit", subtitle: "Autumn / Winter 2026",
          description: "Relaxed tailoring, soft knits and everyday essentials — designed to be worn on repeat.",
          ctaLabel: "Shop now", ctaHref: "/shop?new=1", secondaryCtaLabel: "Shop second hand", secondaryCtaHref: "/categories/second-hand",
          imageUrl: img(I.yellowSet, 2000), sortOrder: 0,
          translations: { km: { title: "ម៉ូដរដូវកាលថ្មី", subtitle: "រដូវស្លឹកឈើជ្រុះ / រដូវរងា ២០២៦", description: "ការកាត់ដេរបែបសាមញ្ញ អាវរងារទន់ និងសម្លៀកបំពាក់ប្រចាំថ្ងៃ — រចនាឡើងសម្រាប់ពាក់ម្តងហើយម្តងទៀត។", ctaLabel: "ទិញឥឡូវនេះ", secondaryCtaLabel: "ទិញសម្លៀកបំពាក់មួយទឹក" } } },
        { placement: "HERO", title: "Modern Menswear", subtitle: "Tailoring, refined",
          description: "Clean lines and honest fabrics for the modern wardrobe.",
          ctaLabel: "Shop men", ctaHref: "/categories/men", secondaryCtaLabel: "The tailoring edit", secondaryCtaHref: "/categories/men-jackets",
          imageUrl: img(I.navySuit, 2000), sortOrder: 1,
          translations: { km: { title: "ម៉ូដបុរសទំនើប", subtitle: "ការកាត់ដេរដ៏ប្រណិត", ctaLabel: "ទិញសម្រាប់បុរស" } } },
        { placement: "PROMO", title: "Up to 25% off selected styles", subtitle: "Limited time",
          description: "Plus 10% off your first order with code WELCOME10.",
          ctaLabel: "Shop the sale", ctaHref: "/shop?sale=1", imageUrl: img(I.storeRacks, 2000), sortOrder: 0,
          translations: { km: { title: "បញ្ចុះតម្លៃរហូតដល់ 25%", subtitle: "សម្រាប់រយៈពេលកំណត់", description: "បូកបញ្ចុះ 10% លើការកម្ម៉ង់ដំបូង ជាមួយលេខកូដ WELCOME10។", ctaLabel: "ទិញទំនិញបញ្ចុះតម្លៃ" } } },
        { placement: "EDITORIAL", title: "Quiet Neutrals", subtitle: "Lookbook 01", ctaLabel: "Shop the look", ctaHref: "/categories/women-sweaters", imageUrl: img(I.rackNeutral, 1400), sortOrder: 0,
          translations: { km: { title: "ពណ៌ស្ងប់ស្ងាត់", ctaLabel: "មើលម៉ូដនេះ" } } },
        { placement: "EDITORIAL", title: "City Layers", subtitle: "Lookbook 02", ctaLabel: "Shop the look", ctaHref: "/categories/men-jackets", imageUrl: img(I.manLeather, 1400), sortOrder: 1,
          translations: { km: { title: "ស្រទាប់ទីក្រុង", ctaLabel: "មើលម៉ូដនេះ" } } },
        { placement: "EDITORIAL", title: "Off-Duty", subtitle: "Lookbook 03", ctaLabel: "Shop the look", ctaHref: "/categories/women", imageUrl: img(I.burgundyCoat, 1400), sortOrder: 2,
          translations: { km: { title: "ថ្ងៃសម្រាក", ctaLabel: "មើលម៉ូដនេះ" } } },
      ],
    });
  }

  // Coupons & promotions
  const accessories = await prisma.category.findUnique({ where: { slug: "accessories" } });
  await prisma.coupon.upsert({ where: { code: "WELCOME10" }, update: {}, create: { code: "WELCOME10", description: "10% off your first order", type: "PERCENTAGE", value: "10", maxDiscount: "30" } });
  await prisma.coupon.upsert({ where: { code: "SUMMER5" }, update: {}, create: { code: "SUMMER5", description: "$5 off orders over $30", type: "FIXED", value: "5", minOrderAmount: "30" } });
  await prisma.coupon.upsert({ where: { code: "EXPIRED20" }, update: {}, create: { code: "EXPIRED20", description: "Expired test coupon", type: "PERCENTAGE", value: "20", expiresAt: new Date("2025-01-01") } });
  if (accessories && (await prisma.promotion.count()) === 0) {
    await prisma.promotion.create({
      data: { name: "Accessories week — 15% off", type: "PERCENTAGE", value: "15", scope: "CATEGORY", categories: { connect: [{ id: accessories.id }] } },
    });
  }

  // Staff + demo customer
  const demoUsers = [
    { email: "staff@dany.local", name: "Store Staff", role: "STAFF" as const, password: "Staff@12345" },
    { email: "customer@dany.local", name: "Sokha Chan", role: "CUSTOMER" as const, password: "Customer@123", phone: "012345678" },
  ];
  for (const u of demoUsers) {
    if (await prisma.user.findUnique({ where: { email: u.email } })) continue;
    await prisma.user.create({
      data: {
        email: u.email, name: u.name, role: u.role, phone: u.phone ?? null, passwordHash: await bcrypt.hash(u.password, 12),
        ...(u.role === "CUSTOMER"
          ? {
              customerProfile: { create: {} },
              addresses: { create: { label: "Home", fullName: u.name, phone: u.phone ?? "", province: "Siem Reap", district: "Siem Reap", commune: "Svay Dangkum", addressLine: "No. 12, Sivatha Blvd", isDefault: true } },
            }
          : {}),
      },
    });
  }
}

async function main() {
  console.log("Seeding reference data…");
  await seedReference();
  await seedOptionTranslations(prisma);
  if (SEED_DEMO) {
    console.log("Seeding demo catalog (development only)…");
    await seedDemo();
    await seedKhmerDemoContent(prisma);
  } else {
    console.log("Production mode: demo catalog skipped.");
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
