import type { Metadata } from "next";
import { requireCustomerPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddressBook } from "@/components/account/address-book";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireCustomerPage("/account/addresses");
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <AddressBook
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label ?? "",
        fullName: a.fullName,
        phone: a.phone,
        province: a.province,
        district: a.district,
        commune: a.commune,
        addressLine: a.addressLine,
        notes: a.notes ?? "",
        isDefault: a.isDefault,
      }))}
    />
  );
}
