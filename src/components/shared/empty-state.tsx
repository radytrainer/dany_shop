import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24", className)}>
      {Icon && (
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        </div>
      )}
      <h2 className="font-heading text-2xl">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && (
        <Button asChild size="xl" className="mt-8">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
