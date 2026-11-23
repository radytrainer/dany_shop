import { expect, test, type Page } from "@playwright/test";
import { query } from "./db";

/**
 * Full customer journey from the specification:
 * browse → product → size/colour → cart → quantity → remove → totals → coupon → checkout →
 * delivery → submit → saved in PostgreSQL → messaging link → admin confirms & updates status.
 */

const money = (s: string) => Number(s.replace(/[^\d.]/g, ""));

async function chooseFirstAvailable(page: Page) {
  // Colour: first swatch that is not marked unavailable; then first available size.
  await page.locator("fieldset").nth(0).locator('button[aria-label]:not([aria-label*="Unavailable"])').first().click();
  await page.locator("fieldset").nth(1).locator('button[aria-label]:not([aria-label*="Unavailable"])').first().click();
}

test("customer journey and admin fulfilment", async ({ page, isMobile }) => {
  // Every run fulfils an order and deducts stock; keep in-stock variants of the products used
  // here deep enough for "quantity 2". Out-of-stock variants stay out of stock.
  await query(
    `UPDATE "ProductVariant" SET stock = GREATEST(stock, 20)
     WHERE stock > 0 AND "productId" IN (SELECT id FROM "Product" WHERE slug IN ('premium-oversized-t-shirt', 'casual-shirt'))`,
  );

  // 1. Homepage
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();

  // 2. Browse a category
  await page.goto("/categories/men");
  await expect(page.getByTestId("product-count")).toContainText(/\d+/);
  await expect(page.getByTestId("product-card").first()).toBeVisible();

  // 3. Open a product
  await page.goto("/products/premium-oversized-t-shirt");
  await expect(page.locator("h1")).toHaveText("Premium Oversized T-Shirt");

  // Validation: cannot add without size/colour
  await page.getByTestId("add-to-cart").first().click();
  await expect(page.getByText("Please choose a size.")).toBeVisible();
  await expect(page.getByText("Please choose a color.")).toBeVisible();
  // Tooltip next to the tapped button (visible even when the pickers are off screen on phones)
  await expect(page.getByTestId("selection-hint")).toHaveText("Please choose a color and size.");
  await expect(page.getByTestId("cart-drawer")).toBeHidden();

  // 4–6. Select colour + size, add to cart
  await chooseFirstAvailable(page);
  await page.getByTestId("add-to-cart").first().click();
  const drawer = page.getByTestId("cart-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId("cart-line")).toHaveCount(1);
  await page.keyboard.press("Escape");

  // Add a second product, then remove it (step 8)
  await page.goto("/products/casual-shirt");
  await chooseFirstAvailable(page);
  await page.getByTestId("add-to-cart").first().click();
  await expect(drawer.getByTestId("cart-line")).toHaveCount(2);
  await page.keyboard.press("Escape");

  // 7. Update quantity on the cart page
  await page.goto("/cart");
  const lines = page.getByTestId("cart-line");
  await expect(lines).toHaveCount(2);
  await lines.first().getByRole("button", { name: "Increase quantity" }).click();
  await expect(lines.first().getByText("2", { exact: true })).toBeVisible();

  // 8. Remove the second product
  await lines.nth(1).getByTestId("remove-line").click();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);

  // 9. Price check: 2 × $15.00 = $30.00
  await expect(page.getByTestId("subtotal")).toContainText("$30.00");

  // 10. Invalid then valid coupon
  await page.getByTestId("coupon-input").fill("EXPIRED20");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("coupon-error")).toContainText(/expired/i);
  await page.getByTestId("coupon-input").fill("WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("discount")).toContainText("3.00");
  await expect(page.getByTestId("grand-total")).toContainText("$27.00");

  // 11–13. Checkout
  await page.getByTestId("cart-checkout").click();
  await page.waitForURL("**/checkout");
  await page.getByTestId("place-order").click(); // empty form → validation
  await expect(page.locator("#fullName-error")).toBeVisible();

  await page.fill("#fullName", "E2E Customer");
  await page.fill("#phone", "012 999 888");
  await page.fill("#telegramUsername", "e2e_customer");
  await page.fill("#addressLine", "No. 7, Street 51");
  await page.fill("#province", "Siem Reap");
  await page.fill("#district", "Daun Penh");
  await page.fill("#commune", "Phsar Thmei");
  await page.getByTestId("delivery-option").first().click();
  await expect(page.getByTestId("delivery")).toContainText("$1.50");
  await expect(page.getByTestId("grand-total")).toContainText("$28.50");
  await page.getByTestId("channel-telegram").click();
  await page.getByTestId("place-order").click();

  // 14. Saved in PostgreSQL
  await page.waitForURL(/\/orders\/ORD-\d{4}-\d{5}/);
  const orderNumber = (await page.getByTestId("order-number").innerText()).trim();
  const [row] = await query<{ status: string; grandTotal: string; couponCode: string; customerName: string }>(
    `SELECT status, "grandTotal"::text AS "grandTotal", "couponCode", "customerName" FROM "Order" WHERE "orderNumber" = $1`,
    [orderNumber],
  );
  expect(row).toMatchObject({ status: "PENDING", couponCode: "WELCOME10", customerName: "E2E Customer" });
  expect(money(row.grandTotal)).toBe(28.5);

  // Receipt PDF downloads from the confirmation page
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("receipt-actions").getByRole("link").first().click(),
  ]);
  expect(download.suggestedFilename()).toBe(`receipt-${orderNumber}.pdf`);
  const pdfPath = await download.path();
  expect((await import("node:fs")).readFileSync(pdfPath).subarray(0, 5).toString()).toBe("%PDF-");

  // 15–16. Messaging link contains the order details
  const href = await page.getByTestId("send-telegram").getAttribute("data-href");
  expect(href).toMatch(/^https:\/\/t\.me\/[A-Za-z0-9_]+\?text=/);
  const text = decodeURIComponent(href!.split("?text=")[1]);
  expect(text).toContain(orderNumber);
  expect(text).toContain("Premium Oversized T-Shirt");
  expect(text).toContain("Quantity: 2");
  expect(text).toContain("TOTAL: $28.50");
  await expect(page.getByText(/not confirmed yet/i)).toBeVisible();

  // 17. Admin login (new context = no customer session)
  const admin = await page.context().browser()!.newPage({ viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  await admin.goto("/admin/login");
  await admin.fill("input[name=email]", process.env.E2E_ADMIN_EMAIL ?? "admin@dany.local");
  await admin.fill("input[name=password]", process.env.E2E_ADMIN_PASSWORD ?? "Admin@12345");
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/admin");

  // 18. View the submitted order
  await admin.goto(`/admin/orders?q=${orderNumber}`);
  await admin.getByRole("link", { name: orderNumber }).click();
  await expect(admin.getByRole("heading", { name: orderNumber })).toBeVisible();

  // 19. Confirm
  await admin.getByTestId("status-select").selectOption("CONFIRMED");
  await admin.getByTestId("update-status").click();
  await expect(admin.locator('[data-status="CONFIRMED"]').first()).toBeVisible();

  // 20. Further status update
  await admin.getByTestId("status-select").selectOption("AWAITING_PAYMENT");
  await admin.getByTestId("update-status").click();
  await expect(admin.locator('[data-status="AWAITING_PAYMENT"]').first()).toBeVisible();

  const [after] = await query<{ status: string; stockState: string }>(`SELECT status, "stockState" FROM "Order" WHERE "orderNumber" = $1`, [orderNumber]);
  expect(after).toMatchObject({ status: "AWAITING_PAYMENT", stockState: "DEDUCTED" });
  await admin.close();
});

test("empty cart and unavailable states", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: /bag is empty/i })).toBeVisible();
  await page.goto("/products/does-not-exist");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  await page.goto("/search?q=zzzzzz-no-match");
  await expect(page.getByRole("heading", { name: /No results/i })).toBeVisible();
});

test("login with ?next redirects safely and unknown pages return 404", async ({ page, request }) => {
  // Regression: the login page must render server-side with a ?next parameter.
  const res = await page.goto("/account/login?next=/account/orders");
  expect(res?.status()).toBe(200);
  await page.fill("input[name=email]", "customer@dany.local");
  await page.fill("input[name=password]", "Customer@123");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/account/orders");

  // Open-redirect attempts fall back to the account page.
  await page.goto("/account/login?next=//evil.example");
  await page.waitForURL((u) => u.pathname === "/account");

  for (const path of ["/products/does-not-exist", "/categories/nope", "/collections/nope", "/help/nope", "/orders/ORD-2026-99999"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("switches between English and Khmer with translated content", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/products/wrap-linen-dress");
  await expect(page.locator("h1")).toHaveText("Wrap Linen Dress");

  // Switch to Khmer via the header toggle
  await page.getByTestId("language-toggle").click();
  await expect(page.getByTestId("language-toggle")).toHaveText(/EN/);
  await expect(page.locator("html")).toHaveAttribute("lang", "km");
  await expect(page.locator("h1")).toHaveText("រ៉ូបរុំក្រណាត់លីនិន");
  await expect(page.getByTestId("add-to-cart").first()).toHaveText(/ដាក់/);
  // Colour names translated, prices formatted identically
  await expect(page.locator('button[title="ខៀវ"]')).toHaveCount(1);
  await expect(page.getByText("$55.00").first()).toBeVisible();

  // And back to English
  await page.getByTestId("language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText("Wrap Linen Dress");
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});
