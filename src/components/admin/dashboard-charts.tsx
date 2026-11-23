"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

const MARK = "#A67C52"; // brand camel — single-series mark, ≥3:1 contrast on the white surface
const INK_MUTED = "#737373";
const GRID = "#ededed";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  AWAITING_SELLER_CONFIRMATION: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_RECEIVED: "Payment received",
  PREPARING: "Preparing",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-sm border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="text-muted-foreground">{title}</p>
      <p className="mt-0.5 font-medium text-foreground tabular-nums">{value}</p>
    </div>
  );
}

/** Daily order value (non-cancelled orders), last 30 days. One series → no legend; table view available. */
export function SalesChart({ daily, currency }: { daily: { date: string; orders: number; totalCents: number }[]; currency: string }) {
  const [table, setTable] = useState(false);
  const data = daily.map((d) => ({ ...d, label: d.date.slice(5), value: d.totalCents / 100 }));
  const empty = daily.every((d) => d.orders === 0);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Order value per day</h2>
          <p className="text-xs text-muted-foreground">Last 30 days · excludes cancelled orders</p>
        </div>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-xs underline underline-offset-4">
          {table ? "Show chart" : "Show table"}
        </button>
      </div>
      {empty ? (
        <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No orders in the last 30 days yet.</p>
      ) : table ? (
        <div className="max-h-64 overflow-y-auto text-xs">
          <table className="w-full">
            <thead className="sticky top-0 bg-background text-left text-muted-foreground">
              <tr>
                <th className="py-1.5">Date</th>
                <th className="py-1.5 text-right">Orders</th>
                <th className="py-1.5 text-right">Order value</th>
              </tr>
            </thead>
            <tbody>
              {daily
                .filter((d) => d.orders > 0)
                .map((d) => (
                  <tr key={d.date} className="border-t">
                    <td className="py-1.5">{d.date}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoney(d.totalCents, currency)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64" role="img" aria-label="Bar chart of daily order value for the last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: INK_MUTED }} tickLine={false} axisLine={{ stroke: GRID }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: INK_MUTED }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatMoney(Math.round(v * 100), currency).replace(/\.00$/, "")} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <TooltipBox
                      title={`${(payload[0].payload as { date: string }).date} · ${(payload[0].payload as { orders: number }).orders} orders`}
                      value={formatMoney((payload[0].payload as { totalCents: number }).totalCents, currency)}
                    />
                  ) : null
                }
              />
              <Bar dataKey="value" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Orders by status: magnitude per category → sorted horizontal bars, one hue. */
export function StatusChart({ breakdown }: { breakdown: { status: string; count: number }[] }) {
  const data = [...breakdown].sort((a, b) => b.count - a.count).map((b) => ({ ...b, label: STATUS_LABEL[b.status] ?? b.status }));
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Orders by status</h2>
      {data.length === 0 ? (
        <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div style={{ height: Math.max(120, data.length * 32 + 16) }} role="img" aria-label="Horizontal bar chart of order counts by status">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barCategoryGap={6}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: "#171717" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={({ active, payload }) =>
                  active && payload?.[0] ? <TooltipBox title={(payload[0].payload as { label: string }).label} value={`${payload[0].value} orders`} /> : null
                }
              />
              <Bar dataKey="count" fill={MARK} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fontSize: 11, fill: INK_MUTED }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
