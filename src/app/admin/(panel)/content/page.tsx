import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/admin-ui";
import { BannerManager } from "@/components/admin/banner-manager";

export const metadata = { title: "Banners & content" };

export default async function ContentPage() {
  await requireAdminPage("content.manage");
  const banners = await prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  return (
    <div>
      <PageHeader
        title="Banners & content"
        description="Hero slides, the promotional banner and lookbook tiles on the homepage."
        actions={
          <Link href="/admin/settings#homepage" className="text-sm underline underline-offset-4">
            Homepage sections, announcement bar & social gallery →
          </Link>
        }
      />
      <BannerManager
        banners={banners.map((b) => {
          const km = ((b.translations as Record<string, Record<string, string>>) ?? {}).km ?? {};
          return {
            id: b.id,
            placement: b.placement,
            title: b.title,
            subtitle: b.subtitle ?? "",
            description: b.description ?? "",
            ctaLabel: b.ctaLabel ?? "",
            ctaHref: b.ctaHref ?? "",
            secondaryCtaLabel: b.secondaryCtaLabel ?? "",
            secondaryCtaHref: b.secondaryCtaHref ?? "",
            imageUrl: b.imageUrl,
            mobileImageUrl: b.mobileImageUrl,
            sortOrder: b.sortOrder,
            isActive: b.isActive,
            startsAt: b.startsAt?.toISOString() ?? "",
            endsAt: b.endsAt?.toISOString() ?? "",
            km,
          };
        })}
      />
    </div>
  );
}
