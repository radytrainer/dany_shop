import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it("allows same-site relative paths", () => expect(safeNext("/account/orders?x=1", "/account")).toBe("/account/orders?x=1"));
  it("blocks protocol-relative and absolute URLs", () => {
    expect(safeNext("//evil.example", "/account")).toBe("/account");
    expect(safeNext("/\\evil.example", "/account")).toBe("/account");
    expect(safeNext("/%2F%2Fevil.example", "/account")).toBe("/%2F%2Fevil.example");
    expect(safeNext("https://evil.example", "/account")).toBe("/account");
    expect(safeNext(undefined, "/account")).toBe("/account");
  });
});
