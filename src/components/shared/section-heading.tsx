import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
  className,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4 sm:mb-8", align === "center" && "flex-col items-center text-center", className)}>
      <div>
        <h2 className="text-xl leading-tight font-light tracking-[0.18em] uppercase sm:text-[26px]">{title}</h2>
        {subtitle && <p className="mt-2 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-[0.14em] uppercase underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
