import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Store logo. Uses the admin-configured logo image (Settings → Logo); falls back to the text
 * wordmark if none is set. Sized by height via `className` (e.g. "h-8"); width follows the image.
 */
export function BrandLogo({
  logoUrl,
  storeName,
  className,
  priority = false,
  textClassName,
}: {
  logoUrl: string | null;
  storeName: string;
  className?: string;
  priority?: boolean;
  textClassName?: string;
}) {
  if (!logoUrl) {
    return (
      <span lang="en" className={cn("font-heading leading-none tracking-[0.18em] uppercase", textClassName)}>
        {storeName}
      </span>
    );
  }
  return (
    <Image
      src={logoUrl}
      alt={storeName}
      width={1200}
      height={360}
      priority={priority}
      sizes="(min-width: 1024px) 180px, 120px"
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}
