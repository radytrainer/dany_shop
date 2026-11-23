import { describe, expect, it } from "vitest";
import {
  buildOrderMessage,
  messengerLink,
  MAX_MESSAGE_LENGTH,
  normalizeTelegramUsername,
  normalizeWhatsappNumber,
  telegramLink,
  whatsappLink,
  type OrderMessageData,
} from "@/lib/messaging/order-message";
import en from "@/i18n/messages/en";
import { csvCell } from "@/lib/csv";

const order: OrderMessageData = {
  orderNumber: "ORD-2026-00001",
  currency: "USD",
  customerName: "Customer Name",
  phone: "012345678",
  telegramUsername: "customer_tg",
  email: null,
  addressLine: "No. 12, Street 310",
  commune: "Tonle Bassac",
  district: "Chamkarmon",
  province: "Phnom Penh",
  deliveryMethodName: "Phnom Penh delivery",
  deliveryNotes: null,
  items: [
    { productName: "Premium Oversized T-Shirt", sizeName: "L", colorName: "Black", quantity: 2, unitCents: 1500, lineCents: 3000 },
    { productName: "Casual Shirt", sizeName: "M", colorName: "White", quantity: 1, unitCents: 2200, lineCents: 2200 },
  ],
  subtotalCents: 5200,
  discountCents: 0,
  deliveryCents: 200,
  taxCents: 0,
  grandTotalCents: 5400,
  couponCode: null,
};

describe("order message", () => {
  const msg = buildOrderMessage(order, en.messages);

  it("matches the specification layout", () => {
    expect(msg.startsWith("NEW CLOTHING ORDER\n\nOrder Number: ORD-2026-00001")).toBe(true);
    expect(msg).toContain("Name: Customer Name");
    expect(msg).toContain("Phone: 012345678");
    expect(msg).toContain("1. Premium Oversized T-Shirt\n   Size: L\n   Color: Black\n   Quantity: 2\n   Unit Price: $15.00\n   Subtotal: $30.00");
    expect(msg).toContain("2. Casual Shirt");
    expect(msg).toContain("Subtotal: $52.00");
    expect(msg).toContain("Delivery: $2.00");
    expect(msg).toContain("TOTAL: $54.00");
    expect(msg.trim().endsWith("Please confirm product availability and provide payment instructions.")).toBe(true);
  });

  it("builds encoded Telegram and WhatsApp deep links", () => {
    const tg = telegramLink("@seller_shop", msg)!;
    expect(tg.startsWith("https://t.me/seller_shop?text=")).toBe(true);
    expect(decodeURIComponent(tg.split("?text=")[1])).toBe(msg);
    const wa = whatsappLink("+855 12 345 678", msg)!;
    expect(wa.startsWith("https://wa.me/85512345678?text=")).toBe(true);
  });

  it("rejects invalid channel configuration", () => {
    expect(telegramLink("ab", msg)).toBeNull();
    expect(whatsappLink("123", msg)).toBeNull();
    expect(messengerLink("javascript:alert(1)")).toBeNull();
    expect(messengerLink("https://evil.example/page")).toBeNull();
    expect(messengerLink("https://m.me/danyshop")).toBe("https://m.me/danyshop");
    expect(normalizeTelegramUsername("https://t.me/dany_shop")).toBe("dany_shop");
    expect(normalizeWhatsappNumber("012")).toBeNull();
  });

  it("keeps very large orders within link length limits", () => {
    const big = { ...order, items: Array.from({ length: 80 }, (_, i) => ({ ...order.items[0], productName: `Product number ${i}` })) };
    const long = buildOrderMessage(big, en.messages);
    expect(long.length).toBeLessThan(MAX_MESSAGE_LENGTH + 600);
    expect(long).toContain("TOTAL:");
  });
});

describe("csv export", () => {
  it("escapes quotes/commas and neutralises formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });
});

describe("messaging accounts from Contact & social links", () => {
  it("reads the Telegram username from a t.me link", async () => {
    const { telegramUsernameFromLink } = await import("@/lib/messaging/order-message");
    expect(telegramUsernameFromLink("https://t.me/radytv")).toBe("radytv");
    expect(telegramUsernameFromLink("https://telegram.me/dany_shop/")).toBe("dany_shop");
    expect(telegramUsernameFromLink("https://t.me/+AbCdEf123")).toBeNull(); // invite link, not a chat
    expect(telegramUsernameFromLink("https://t.me/joinchat/xyz")).toBeNull();
    expect(telegramUsernameFromLink("https://example.com/radytv")).toBeNull();
    expect(telegramUsernameFromLink(null)).toBeNull();
  });

  it("turns a Facebook page or profile into a Messenger chat link", async () => {
    const { messengerFromFacebookUrl } = await import("@/lib/messaging/order-message");
    expect(messengerFromFacebookUrl("https://www.facebook.com/Rady.bmcs/")).toBe("https://m.me/Rady.bmcs");
    expect(messengerFromFacebookUrl("https://m.facebook.com/danyshop")).toBe("https://m.me/danyshop");
    expect(messengerFromFacebookUrl("https://www.facebook.com/profile.php?id=100012345678")).toBe("https://m.me/100012345678");
    expect(messengerFromFacebookUrl("https://www.facebook.com/pages/Dany-Shop/123456789")).toBe("https://m.me/123456789");
    expect(messengerFromFacebookUrl("https://m.me/danyshop")).toBe("https://m.me/danyshop");
    expect(messengerFromFacebookUrl("https://www.facebook.com/groups/123")).toBeNull();
    expect(messengerFromFacebookUrl("https://www.facebook.com/share/abc")).toBeNull();
    expect(messengerFromFacebookUrl("http://facebook.com/danyshop")).toBeNull();
  });
});
