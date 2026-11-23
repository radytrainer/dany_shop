/**
 * Khmer translations for seed data. Only fills gaps — never overwrites translations an admin has edited.
 * Please have a native speaker review before launch.
 */
import type { PrismaClient } from "../src/generated/prisma/client";

type Json = Record<string, Record<string, string>>;
const asJson = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});

/** Merge `km` fields into a JSON translations column without replacing existing values. */
function mergeKm(existing: unknown, km: Record<string, string>): Json {
  const tr = asJson(existing);
  const current = tr.km ?? {};
  const merged = { ...km, ...Object.fromEntries(Object.entries(current).filter(([, v]) => v && v.trim())) };
  return { ...tr, km: merged };
}

// ───────────────────────────── Reference data (always) ─────────────────────────────

export const COLOR_KM: Record<string, string> = {
  Black: "ខ្មៅ",
  White: "ស",
  Cream: "ពណ៌ក្រែម",
  Beige: "ពណ៌បេហ្ស",
  Camel: "ពណ៌អូដ្ឋ",
  Brown: "ត្នោត",
  Grey: "ប្រផេះ",
  Navy: "ខៀវចាស់",
  Blue: "ខៀវ",
  Denim: "ខៀវខូវប៊យ",
  Red: "ក្រហម",
  Burgundy: "ក្រហមទុំ",
  Pink: "ផ្កាឈូក",
  Olive: "បៃតងអូលីវ",
  Orange: "ទឹកក្រូច",
};

export const SIZE_KM: Record<string, string> = { "One Size": "ទំហំតែមួយ" };

export async function seedOptionTranslations(prisma: PrismaClient) {
  for (const [name, km] of Object.entries(COLOR_KM)) {
    const c = await prisma.color.findUnique({ where: { name } });
    if (c) await prisma.color.update({ where: { id: c.id }, data: { translations: mergeKm(c.translations, { name: km }) } });
  }
  for (const [name, km] of Object.entries(SIZE_KM)) {
    const s = await prisma.size.findUnique({ where: { name } });
    if (s) await prisma.size.update({ where: { id: s.id }, data: { translations: mergeKm(s.translations, { name: km }) } });
  }
}

// ───────────────────────────── Demo content ─────────────────────────────

const PRODUCTS_KM: Record<string, [name: string, short: string]> = {
  "flowing-maxi-dress": ["រ៉ូបវែងហោះហើរ", "រ៉ូបវែងដល់ដីធ្វើពីក្រណាត់ស្រាល ដែលរំកិលទៅតាមចលនារបស់អ្នក។"],
  "wrap-linen-dress": ["រ៉ូបរុំក្រណាត់លីនិន", "រ៉ូបលីនិនស្រួលដកដង្ហើម មានខ្សែចងចង្កេះ និងចំហៀងចំហ។"],
  "floral-midi-dress": ["រ៉ូបវែងពាក់កណ្តាលលំនាំផ្កា", "រ៉ូបរាងតឹងខាងលើ រីកខាងក្រោម លំនាំផ្កាគូរដោយដៃ។"],
  "corduroy-shirt-dress": ["រ៉ូបអាវសឺមីក្រណាត់កូឌូរ៉យ", "រ៉ូបអាវសឺមីក្រណាត់កូឌូរ៉យល្អិត មានសំពត់ជ្រួញ។"],
  "embroidered-crop-blouse": ["អាវប្លោសខ្លីប៉ាក់ផ្កា", "អាវកប្បាសស្រាល ប៉ាក់ផ្កាពណ៌ដូចគ្នា។"],
  "relaxed-cotton-tee": ["អាវយឺតកប្បាសរាងធូរ", "អាវយឺតប្រចាំថ្ងៃដែលទន់បំផុតរបស់យើង ធ្វើពីកប្បាសសរីរាង្គ។"],
  "chambray-dot-shirt": ["អាវសឺមីឆាំប្រេលំនាំចំណុច", "អាវសឺមីដៃបីភាគបួន មានលំនាំចំណុចតូចៗ។"],
  "pleated-mini-skirt": ["សំពត់ខ្លីជ្រួញ", "សំពត់ខ្លីជ្រួញរឹងមាំ មានរ៉ូតលាក់នៅចំហៀង។"],
  "wide-leg-striped-trousers": ["ខោជើងធំលំនាំឆ្នូត", "ខោចង្កេះខ្ពស់ ជើងធំ លំនាំឆ្នូតច្បាស់។"],
  "soft-jogger-pants": ["ខោជកឃ័រទន់", "ខោជកឃ័រក្រណាត់រលោង មានកែងខ្សែយឺត និងហោប៉ៅជ្រៅ។"],
  "high-rise-straight-jeans": ["ខោខូវប៊យចង្កេះខ្ពស់ជើងត្រង់", "ខោខូវប៊យរឹង ចង្កេះខ្ពស់ ជើងត្រង់ប្រវែងដល់កជើង។"],
  "distressed-boyfriend-jeans": ["ខោខូវប៊យរាងធូររហែក", "ខោខូវប៊យរាងធូរ មានស្នាមរហែកធ្វើដោយដៃ។"],
  "wool-blend-coat": ["អាវធំរោមចៀមលាយ", "អាវធំរោមចៀមលាយពីរជាន់ ស្មាទម្លាក់។"],
  "check-tailored-blazer": ["អាវប្លេហ្សឺលំនាំក្រឡា", "អាវប្លេហ្សឺរាងធំ ឡេវមួយជួរ លំនាំក្រឡាបុរាណ។"],
  "chunky-knit-sweater": ["អាវរងារត្បាញក្រាស់", "អាវត្បាញលំនាំក្រាហ្វិក ក្រណាត់រោមចៀមលាយកប្បាសទន់។"],
  "fringe-knit-poncho": ["អាវប៉ុនឆូត្បាញមានរំយោល", "អាវប៉ុនឆូត្បាញចំហ មានរំយោលចងដោយដៃ។"],
  "premium-oversized-t-shirt": ["អាវយឺតធំទំហំពិសេស", "អាវយឺតកប្បាសក្រាស់ 240gsm រាងធូរ និងស្រួលពាក់។"],
  "graphic-skeleton-tee": ["អាវយឺតរូបគ្រោងឆ្អឹង", "អាវយឺតខ្មៅលាងទឹក មានរូបគូរដោយដៃនៅខាងមុខ។"],
  "cotton-print-tee": ["អាវយឺតកប្បាសបោះពុម្ព", "អាវយឺតសស្អាត មានអក្សរបោះពុម្ពតូចនៅទ្រូង។"],
  "oxford-cotton-shirt": ["អាវសឺមីកប្បាសអុកហ្វដ", "អាវសឺមីអុកហ្វដ មានឡេវកអាវ លាងទឹកឱ្យទន់។"],
  "casual-shirt": ["អាវសឺមីធម្មតា", "អាវសឺមីក្រណាត់ប៉ូប្លីនងាយថែទាំ កអាវបុរាណ។"],
  "pique-polo-shirt": ["អាវប៉ូឡូក្រណាត់ពីកេ", "អាវប៉ូឡូកប្បាសពីកេល្អិត មានឆ្នូតពណ៌ផ្ទុយនៅគែម។"],
  "tailored-chino-pants": ["ខោឈីណូកាត់ដេរ", "ខោឈីណូរាងស្លីម ក្រណាត់កប្បាសយឺត។"],
  "slim-dark-jeans": ["ខោខូវប៊យស្លីមពណ៌ចាស់", "ខោខូវប៊យពណ៌ចាស់ស្អាត ជើងស្លីមត្រង់។"],
  "washed-denim-shorts": ["ខោខ្លីខូវប៊យលាងទឹក", "ខោខ្លីខូវប៊យពណ៌ស្រាល មានកែងបត់។"],
  "leather-biker-jacket": ["អាវក្រៅស្បែកបែបបាយកឃ័រ", "អាវក្រៅស្បែកកូនចៀមទន់ មានរ៉ូតទ្រេត។"],
  "suede-bomber-jacket": ["អាវក្រៅបំបឺរស្វេត", "អាវក្រៅបំបឺរស្រាល ក្រណាត់ស្រដៀងស្វេត។"],
  "trucker-denim-jacket": ["អាវក្រៅខូវប៊យ", "អាវក្រៅខូវប៊យលាងទឹក កអាវកូឌូរ៉យ។"],
  "tailored-suit-jacket": ["អាវធំឈុតកាត់ដេរ", "អាវធំឈុតរោមចៀមអ៊ីតាលី កាត់ដេរយ៉ាងប្រណិត។"],
  "classic-pullover-hoodie": ["អាវមានមួកបុរាណ", "អាវមានមួកក្រណាត់ហ្វ្លីសទន់ មួកពីរជាន់។"],
  "heavyweight-sweatshirt": ["អាវស្វេតក្រាស់", "អាវកកប្បាសក្រាស់ មានកែងរឹតយឺត។"],
  "structured-top-handle-bag": ["កាបូបដៃកាន់រាងរឹង", "កាបូបស្បែករលោង មានខ្សែស្ពាយដោះបាន។"],
  "woven-basket-bag": ["កាបូបត្បាញរាងកន្ត្រក", "កាបូបផ្តៅត្បាញដោយដៃ តុបតែងដោយស្បែក។"],
  "everyday-backpack": ["កាបូបស្ពាយក្រោយប្រចាំថ្ងៃ", "កាបូបស្ពាយការពារទឹក មានថតសម្រាប់កុំព្យូទ័រ។"],
  "washed-cotton-cap": ["មួកកប្បាសលាងទឹក", "មួកកប្បាសប្រាំមួយផ្ទាំង មានខ្សែកែតម្រូវបាន។"],
  "straw-sun-hat": ["មួកចំបើងការពារថ្ងៃ", "មួកចំបើងគែមធំ មានខ្សែបូ។"],
  "round-sunglasses": ["វ៉ែនតាការពារពន្លឺរាងមូល", "ស៊ុមរាងមូលបែបរ៉េត្រូ កញ្ចក់ការពារកាំរស្មី UV400។"],
  "vintage-graphic-tee": ["អាវយឺតវីនថេជរូបភាព", "អាវយឺតកប្បាសទន់ ពាក់ច្រើនដងហើយ មានរូបបែបរ៉េត្រូ។ ពណ៌ស្រាលបន្តិច គ្មានរន្ធ ឬស្នាមប្រឡាក់។"],
  "vintage-washed-tee": ["អាវយឺតវីនថេជលាងទឹក", "អាវយឺតជ្រលក់ពណ៌ មានស្នាមលាងទឹកធម្មជាតិ។ ពាក់តិចតួច ស្ថានភាពល្អណាស់។"],
  "pre-loved-straight-jeans": ["ខោខូវប៊យជើងត្រង់មួយទឹក", "ខោខូវប៊យជើងត្រង់ពណ៌មធ្យម ពាក់តែពីរដង។ គ្មានស្នាមប្រើប្រាស់ឃើញ។"],
  "pre-loved-cream-knit": ["អាវត្បាញពណ៌ក្រែមមួយទឹក", "អាវត្បាញក្រាស់ពណ៌ក្រែម បោកស្អាតរួច។ អំបោះទន់បន្តិចដោយសារការពាក់។"],
  "vintage-linen-blouse": ["អាវប្លោសលីនិនវីនថេជ", "អាវប្លោសលីនិនពណ៌ស ស្រាលខ្យល់ចេញចូលបាន នៅមានស្លាកដើម។"],
  "minimal-leather-watch": ["នាឡិកាខ្សែស្បែកសាមញ្ញ", "នាឡិកាផ្ទៃស្អាត ខ្សែស្បែកធម្មជាតិ។"],
};

const SECOND_HAND_SLUGS = new Set(["vintage-graphic-tee", "vintage-washed-tee", "pre-loved-straight-jeans", "pre-loved-cream-knit", "vintage-linen-blouse"]);

const DESCRIPTION_KM_SECOND_HAND = (short: string) =>
  `${short}\n\nសម្លៀកបំពាក់មួយទឹកនីមួយៗ ត្រូវបានពិនិត្យ សម្អាត និងវាយតម្លៃស្ថានភាពដោយក្រុមការងាររបស់យើង មុនពេលដាក់លក់។ ស្នាមប្រើប្រាស់ណាមួយ ត្រូវបានរៀបរាប់ខាងលើ និងបង្ហាញក្នុងរូបភាព។\n\n• មានតែមួយគត់ — មានតែមួយប៉ុណ្ណោះ\n• វាស់ដោយដាក់រាបស្មើ សូមពិនិត្យតារាងទំហំ\n• មិនអាចប្តូរទំនិញមួយទឹកបានទេ`;

const DESCRIPTION_KM = (short: string) =>
  `${short}\n\nរចនាឡើងសម្រាប់ពាក់ប្រចាំថ្ងៃ និងប្រើប្រាស់បានយូរ។ ធ្វើពីសម្ភារៈដែលជ្រើសរើសយ៉ាងយកចិត្តទុកដាក់ និងបញ្ចប់ដោយភាពល្អិតល្អន់។\n\n• រាងធម្មតា — ជ្រើសរើសទំហំដែលអ្នកពាក់ជាធម្មតា\n• បោកក្នុងទឹកត្រជាក់ ហាលឱ្យរាបស្មើ\n• តារាម៉ូដែលកម្ពស់ ១៧៥ ស.ម ពាក់ទំហំ M`;

const CATEGORY_DESC_KM: Record<string, string> = {
  "second-hand": "សម្លៀកបំពាក់មួយទឹកដែលយើងបានពិនិត្យ និងវាយតម្លៃស្ថានភាព។ មានតែមួយគត់ — អស់ហើយ គឺអស់។",
  women: "សម្លៀកបំពាក់ចាំបាច់ និងម៉ូដលេចធ្លោសម្រាប់គ្រប់ថ្ងៃ។",
  men: "បន្ទាត់ស្អាត ក្រណាត់គុណភាព និងការកាត់ដេរដែលពាក់ស្រួល។",
  accessories: "ការតុបតែងបញ្ចប់៖ កាបូប មួក វ៉ែនតា និងច្រើនទៀត។",
};

const COLLECTION_KM: Record<string, Record<string, string>> = {
  "summer-collection": { description: "ក្រណាត់លីនិន កប្បាសស្រាល និងគ្រឿងតុបតែងសម្រាប់ថ្ងៃក្តៅដ៏វែង។" },
  "winter-collection": { description: "អាវធំរោមចៀម អាវត្បាញក្រាស់ និងស្រទាប់សម្រាប់ល្ងាចត្រជាក់។" },
  "the-tailoring-edit": { description: "អាវប្លេហ្សឺ និងខោដ៏ស្អាតបាត ពាក់បានពីការិយាល័យដល់អាហារពេលល្ងាច។" },
};

const BANNER_KM: Record<string, Record<string, string>> = {
  "Modern Menswear": { description: "បន្ទាត់ស្អាត និងក្រណាត់គុណភាព សម្រាប់ទូខោអាវទំនើប។", secondaryCtaLabel: "ការកាត់ដេរតាមខ្នាត" },
  "Quiet Neutrals": { subtitle: "សៀវភៅម៉ូដ ០១" },
  "City Layers": { subtitle: "សៀវភៅម៉ូដ ០២" },
  "Off-Duty": { subtitle: "សៀវភៅម៉ូដ ០៣" },
};

const DELIVERY_KM: Record<string, Record<string, string>> = {
  "Siem Reap delivery": { estimatedDays: "ក្នុងថ្ងៃ ឬថ្ងៃបន្ទាប់" },
  "Other provinces": { estimatedDays: "២–៤ ថ្ងៃ" },
  "Store pickup (Siem Reap)": { estimatedDays: "រួចរាល់ក្នុង ២៤ ម៉ោង" },
};

const SETTINGS_KM = {
  address: "ខេត្តសៀមរាប ព្រះរាជាណាចក្រកម្ពុជា",
  shippingInfo:
    "សៀមរាប៖ ដឹកជញ្ជូនក្នុងថ្ងៃ ឬថ្ងៃបន្ទាប់ ($1.50 ឥតគិតថ្លៃលើសពី $50)។\nខេត្តផ្សេងៗ៖ ២–៤ ថ្ងៃ ($3.00)។\nមកយកនៅហាងក្នុងខេត្តសៀមរាប ឥតគិតថ្លៃ។\nប្តូរទំនិញបានក្នុងរយៈពេល ៧ ថ្ងៃ សម្រាប់ទំនិញដែលមិនទាន់ពាក់ និងមានស្លាកនៅដដែល។",
  sizeGuide:
    "ទំហំ | ទ្រូង (ស.ម) | ចង្កេះ (ស.ម) | ត្រគាក (ស.ម)\nXS | 80–84 | 62–66 | 86–90\nS | 84–88 | 66–70 | 90–94\nM | 88–94 | 70–76 | 94–100\nL | 94–100 | 76–82 | 100–106\nXL | 100–106 | 82–88 | 106–112\nXXL | 106–112 | 88–94 | 112–118",
};

export async function seedKhmerDemoContent(prisma: PrismaClient) {
  for (const [slug, [name, short]] of Object.entries(PRODUCTS_KM)) {
    const p = await prisma.product.findUnique({ where: { slug }, include: { translations: { where: { locale: "km" } } } });
    if (!p) continue;
    const tr = p.translations[0];
    await prisma.productTranslation.upsert({
      where: { productId_locale: { productId: p.id, locale: "km" } },
      update: {
        name: tr?.name || name,
        shortDescription: tr?.shortDescription || short,
        description: tr?.description || (SECOND_HAND_SLUGS.has(slug) ? DESCRIPTION_KM_SECOND_HAND : DESCRIPTION_KM)(short),
      },
      create: { productId: p.id, locale: "km", name, shortDescription: short, description: (SECOND_HAND_SLUGS.has(slug) ? DESCRIPTION_KM_SECOND_HAND : DESCRIPTION_KM)(short) },
    });
  }

  for (const [slug, description] of Object.entries(CATEGORY_DESC_KM)) {
    const c = await prisma.category.findUnique({ where: { slug }, include: { translations: { where: { locale: "km" } } } });
    const tr = c?.translations[0];
    if (c && tr && !tr.description) await prisma.categoryTranslation.update({ where: { id: tr.id }, data: { description } });
  }

  for (const [slug, km] of Object.entries(COLLECTION_KM)) {
    const c = await prisma.collection.findUnique({ where: { slug } });
    if (c) await prisma.collection.update({ where: { id: c.id }, data: { translations: mergeKm(c.translations, km) } });
  }

  for (const [title, km] of Object.entries(BANNER_KM)) {
    const banners = await prisma.banner.findMany({ where: { title } });
    for (const b of banners) await prisma.banner.update({ where: { id: b.id }, data: { translations: mergeKm(b.translations, km) } });
  }

  for (const [name, km] of Object.entries(DELIVERY_KM)) {
    const methods = await prisma.deliveryMethod.findMany({ where: { name } });
    for (const m of methods) await prisma.deliveryMethod.update({ where: { id: m.id }, data: { translations: mergeKm(m.translations, km) } });
  }

  const settings = await prisma.storeSettings.findUnique({ where: { id: "default" } });
  if (settings) {
    await prisma.storeSettings.update({ where: { id: "default" }, data: { translations: mergeKm(settings.translations, SETTINGS_KM) } });
  }
}
