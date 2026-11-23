import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getStoreSettings, localizedSetting } from "@/services/settings";
import type { MessageKey } from "@/i18n/translator";

const TOPICS = ["how-to-order", "shipping", "size-guide"] as const;
type Topic = (typeof TOPICS)[number];
const TITLES: Record<Topic, MessageKey> = { "how-to-order": "help.howToOrder", shipping: "footer.shippingInfo", "size-guide": "footer.sizeGuide" };

export async function generateMetadata({ params }: PageProps<"/help/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  if (!(TOPICS as readonly string[]).includes(topic)) return {};
  const { t } = await getI18n();
  return { title: t(TITLES[topic as Topic]), alternates: { canonical: `/help/${topic}` } };
}

export default async function HelpPage({ params }: PageProps<"/help/[topic]">) {
  const { topic } = await params;
  if (!(TOPICS as readonly string[]).includes(topic)) notFound();
  const { locale, t } = await getI18n();
  const settings = await getStoreSettings();

  let body: React.ReactNode;
  if (topic === "how-to-order") {
    const steps = [1, 2, 3, 4] as const;
    body = (
      <ol className="mt-10 grid gap-8 sm:grid-cols-2">
        {steps.map((n) => (
          <li key={n} className="border-t pt-5">
            <p className="font-heading text-4xl text-brand">0{n}</p>
            <h2 className="mt-3 text-lg font-medium">{t(`help.step${n}Title`)}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t(`help.step${n}`)}</p>
          </li>
        ))}
      </ol>
    );
  } else {
    const text = localizedSetting(settings, topic === "shipping" ? "shippingInfo" : "sizeGuide", locale);
    const lines = (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.filter((l) => l.includes("|")).map((l) => l.split("|").map((c) => c.trim()));
    const paras = lines.filter((l) => !l.includes("|"));
    body = (
      <div className="mt-8 space-y-4">
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full max-w-2xl text-sm">
              <thead>
                <tr className="border-b">
                  {rows[0].map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, i) => (
                  <tr key={i} className="border-b">
                    {r.map((c, j) => (
                      <td key={j} className="px-3 py-2 tabular-nums">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {paras.map((p, i) => (
          <p key={i} className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
        {lines.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-12 sm:py-16">
      <h1 className="font-heading text-4xl sm:text-5xl">{t(TITLES[topic as Topic])}</h1>
      {body}
    </div>
  );
}
