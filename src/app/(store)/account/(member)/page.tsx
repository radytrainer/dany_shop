import type { Metadata } from "next";
import { requireCustomerPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForms } from "@/components/account/profile-forms";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireCustomerPage("/account");
  const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
  return (
    <ProfileForms
      initial={{
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        telegramUsername: profile?.telegramUsername ?? "",
        newsletter: profile?.newsletter ?? false,
      }}
    />
  );
}
