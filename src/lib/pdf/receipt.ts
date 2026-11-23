import path from "node:path";
import { createElement as h, type ReactElement } from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

/**
 * Order receipt PDF. Rendering is pure: every string arrives already localized
 * and every amount already formatted, so this module only lays the page out.
 * The only caller (services/receipt.ts) is server-only.
 *
 * Font: Battambang covers Khmer (with correct shaping in fontkit) and Latin, so
 * one family renders both languages. Noto Sans Khmer crashes fontkit, and the
 * font lacks "≈", so approximate amounts are written out in words instead.
 */

export type ReceiptLine = {
  name: string;
  detail: string;
  qty: string;
  unit: string;
  amount: string;
};
export type ReceiptRow = { label: string; value: string; strong?: boolean };

export type ReceiptData = {
  lang: "en" | "km";
  logo: Buffer | null;
  storeName: string;
  storeLines: string[];
  title: string;
  orderNumberLabel: string;
  orderNumber: string;
  dateLabel: string;
  date: string;
  badges: ReceiptRow[];
  parties: { heading: string; lines: string[] }[];
  columns: { item: string; qty: string; unit: string; amount: string };
  lines: ReceiptLine[];
  totals: ReceiptRow[];
  totalNote: string | null;
  note: { text: string; tone: "ok" | "warn" | "muted" };
  thanks: string;
  footer: string;
};

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
let fontsReady = false;

function ensureFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Battambang",
    fonts: [
      { src: path.join(FONT_DIR, "Battambang-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Battambang-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // No automatic hyphenation: it would insert "-" inside Khmer clusters and product names.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

// ───────────────────────────── Khmer-safe text ─────────────────────────────
// Khmer split vowels (ើ ឿ ៀ ោ ៅ) shape into two glyphs. react-pdf's text layout
// then maps glyphs back to the string one-for-one, which drops one trailing
// character per split vowel and shifts line breaks. Two workarounds, verified
// by rasterizing the output:
//  • pad each run with one zero-width space per split vowel, so only the
//    invisible padding is dropped;
//  • never let a Khmer run wrap inside the layout engine: render it phrase by
//    phrase (Khmer separates phrases with spaces) in a wrapping row.

const KHMER = /[ក-៿]/;
const SPLIT_VOWELS = /[ើ-ៀោៅ]/g;

const ZWSP = String.fromCharCode(0x200b);
const pad = (run: string) =>
  run + ZWSP.repeat(run.match(SPLIT_VOWELS)?.length ?? 0);

type Style = Record<string, string | number | undefined>;

function T(text: string, given: Style = {}): ReactElement {
  // No lineHeight anywhere: on the Page it makes react-pdf drop the fixed footer.
  const style = given;
  if (!KHMER.test(text)) return h(Text, { style: style as never }, text);
  const phrases = text.split(" ");
  if (phrases.length === 1)
    return h(Text, { style: style as never }, pad(text));
  const justify =
    style.textAlign === "right"
      ? "flex-end"
      : style.textAlign === "center"
        ? "center"
        : "flex-start";
  const { textAlign: _ignored, ...textStyle } = style;
  return h(
    View,
    {
      style: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: justify,
      },
    },
    ...phrases.map((p, i) =>
      h(
        Text,
        { key: i, style: textStyle as never },
        pad(i < phrases.length - 1 ? `${p} ` : p),
      ),
    ),
  );
}

// ───────────────────────────── Layout ─────────────────────────────

const INK = "#111111";
const MUTED = "#6b6b6b";
const RULE = "#d9d9d9";
const TINT = "#f4f2ee";

const s = StyleSheet.create({
  page: {
    fontFamily: "Battambang",
    fontSize: 9.5,
    color: INK,
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { width: 132, height: 39.6, objectFit: "contain" },
  storeLines: { marginTop: 8 },
  titleBox: { alignItems: "flex-end", maxWidth: 240 },
  meta: { marginTop: 4, flexDirection: "row", alignItems: "baseline", gap: 6 },
  badges: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    gap: 5,
    borderWidth: 0.75,
    borderColor: RULE,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  parties: { marginTop: 18, flexDirection: "row", gap: 16 },
  party: { flex: 1, backgroundColor: TINT, padding: 12, gap: 3 },
  table: { marginTop: 22 },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: INK,
    paddingBottom: 5,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: RULE,
    paddingVertical: 7,
  },
  cItem: { flex: 1, paddingRight: 8 },
  cQty: { width: 44 },
  cUnit: { width: 80 },
  cAmount: { width: 84 },
  totals: { marginTop: 14, marginLeft: "auto", width: 250 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: INK,
    marginTop: 4,
    paddingTop: 6,
  },
  note: { marginTop: 24, padding: 12, borderLeftWidth: 3 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderColor: RULE,
    paddingTop: 6,
  },
});

const NOTE_TONES = {
  ok: { borderColor: "#2f7d4f", backgroundColor: "#eef6f0" },
  warn: { borderColor: "#b7791f", backgroundColor: "#fbf5e9" },
  muted: { borderColor: "#8a8a8a", backgroundColor: TINT },
} as const;

function ReceiptDocument({ d }: { d: ReceiptData }): ReactElement {
  // Letter-spacing splits Khmer glyph clusters apart; only track Latin labels.
  const track = d.lang === "en" ? 1 : 0;
  const grand = d.totals.find((r) => r.strong);
  const rows = d.totals.filter((r) => !r.strong);
  const head: Style = { fontSize: 8, fontWeight: 700 };
  const muted: Style = { color: MUTED };

  return h(
    Document,
    {
      title: `${d.title} ${d.orderNumber}`,
      author: d.storeName,
      creator: d.storeName,
      producer: d.storeName,
    },
    h(
      Page,
      { size: "A4", style: s.page },
      // Header: brand and store details | title, order number, date
      h(
        View,
        { style: s.header },
        h(
          View,
          { style: { maxWidth: 250 } },
          d.logo
            ? h(Image, { src: d.logo, style: s.logo })
            : T(d.storeName, {
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
              }),
          h(
            View,
            { style: s.storeLines },
            ...d.storeLines.map((l) => T(l, { fontSize: 8.5, color: MUTED })),
          ),
        ),
        h(
          View,
          { style: s.titleBox },
          T(d.title, {
            fontSize: 15,
            fontWeight: 700,
            textAlign: "right",
            marginBottom: 6,
          }),
          h(
            View,
            { style: s.meta },
            T(d.orderNumberLabel, muted),
            T(d.orderNumber, { fontWeight: 700 }),
          ),
          h(View, { style: s.meta }, T(d.dateLabel, muted), T(d.date)),
        ),
      ),
      h(
        View,
        { style: s.badges },
        ...d.badges.map((b) =>
          h(
            View,
            { style: s.badge },
            T(b.label, muted),
            T(b.value, { fontWeight: 700 }),
          ),
        ),
      ),
      h(
        View,
        { style: s.parties },
        ...d.parties.map((p) =>
          h(
            View,
            { style: s.party },
            T(d.lang === "en" ? p.heading.toUpperCase() : p.heading, {
              fontSize: 8,
              fontWeight: 700,
              color: MUTED,
              letterSpacing: track,
              marginBottom: 4,
            }),
            ...p.lines.map((l) => T(l)),
          ),
        ),
      ),
      // Items (the header row repeats if the table runs onto another page)
      h(
        View,
        { style: s.table },
        h(
          View,
          { style: s.thead, fixed: true },
          h(View, { style: s.cItem }, T(d.columns.item, head)),
          h(
            View,
            { style: s.cQty },
            T(d.columns.qty, { ...head, textAlign: "center" }),
          ),
          h(
            View,
            { style: s.cUnit },
            T(d.columns.unit, { ...head, textAlign: "right" }),
          ),
          h(
            View,
            { style: s.cAmount },
            T(d.columns.amount, { ...head, textAlign: "right" }),
          ),
        ),
        ...d.lines.map((l) =>
          h(
            View,
            { style: s.tr, wrap: false },
            h(
              View,
              { style: s.cItem },
              T(l.name),
              T(l.detail, { color: MUTED, fontSize: 8.5 }),
            ),
            h(View, { style: s.cQty }, T(l.qty, { textAlign: "center" })),
            h(View, { style: s.cUnit }, T(l.unit, { textAlign: "right" })),
            h(View, { style: s.cAmount }, T(l.amount, { textAlign: "right" })),
          ),
        ),
      ),
      h(
        View,
        { style: s.totals, wrap: false },
        ...rows.map((r) =>
          h(View, { style: s.totalRow }, T(r.label, muted), T(r.value)),
        ),
        grand
          ? h(
              View,
              { style: s.grandRow },
              T(grand.label, { fontSize: 12, fontWeight: 700 }),
              T(grand.value, { fontSize: 12, fontWeight: 700 }),
            )
          : null,
        // A trailing space keeps the last glyph (៛) clear of the right edge.
        d.totalNote
          ? T(`${d.totalNote} `, {
              color: MUTED,
              fontSize: 8.5,
              textAlign: "right",
              marginTop: 2,
            })
          : null,
      ),
      h(
        View,
        { style: { ...s.note, ...NOTE_TONES[d.note.tone] }, wrap: false },
        T(d.note.text),
      ),
      h(
        View,
        { style: { marginTop: 22 } },
        T(d.thanks, { fontSize: 12, fontWeight: 700, textAlign: "center" }),
      ),
      h(
        View,
        { style: s.footer, fixed: true },
        T(d.footer, { fontSize: 7.5, color: MUTED }),
        h(Text, {
          style: { fontSize: 7.5, color: MUTED },
          render: ({
            pageNumber,
            totalPages,
          }: {
            pageNumber: number;
            totalPages: number;
          }) => `${pageNumber} / ${totalPages}`,
        }),
      ),
    ),
  );
}

export async function renderReceiptPdf(data: ReceiptData): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(
    h(ReceiptDocument, { d: data }) as Parameters<typeof renderToBuffer>[0],
  );
}
