import { z } from "zod";
import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchParamsToRecord } from "@/lib/validations/catalog";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, PageHeader } from "@/components/admin/admin-ui";

export const metadata = { title: "Activity log" };
const schema = z.object({ page: z.coerce.number().int().min(1).catch(1).default(1) });

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdminPage("logs.view");
  const { page } = schema.parse(searchParamsToRecord(await searchParams));
  const [total, items] = await Promise.all([
    prisma.adminActivityLog.count(),
    prisma.adminActivityLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { user: { select: { name: true, email: true } } } }),
  ]);
  const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "medium" });
  return (
    <div>
      <PageHeader title="Activity log" description="Audit trail of sign-ins and sensitive admin operations." />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b bg-secondary/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Entity</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
                <th className="px-4 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 whitespace-nowrap">{dt.format(l.createdAt)}</td>
                  <td className="px-4 py-2">{l.user?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{l.action}</td>
                  <td className="px-4 py-2">
                    {l.entityType}
                    {l.entityId && <span className="block max-w-[180px] truncate text-muted-foreground">{l.entityId}</span>}
                  </td>
                  <td className="max-w-md px-4 py-2 break-words text-muted-foreground">{JSON.stringify(l.metadata)}</td>
                  <td className="px-4 py-2">{l.ip ?? "—"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <AdminPagination page={page} pageCount={Math.max(1, Math.ceil(total / 50))} href={(p) => `/admin/activity?page=${p}`} />
    </div>
  );
}
