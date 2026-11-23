import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-heading text-6xl">404</p>
      <p className="mt-3 text-sm text-muted-foreground">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-8 text-xs font-semibold tracking-[0.14em] uppercase underline underline-offset-4">
        Back to home
      </Link>
    </div>
  );
}
