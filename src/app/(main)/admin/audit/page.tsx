import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/current-user";
import { listAuditLogs } from "@/server/services/audit.service";
import { connectDB } from "@/server/db/connect";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Diiwaanka" };

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePagePermission("audit:view", "/admin/audit");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  await connectDB();
  const data = await listAuditLogs(page, 30);
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card p-2 sm:p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waqtiga</TableHead>
              <TableHead>Qofka</TableHead>
              <TableHead>Ficilka</TableHead>
              <TableHead>Bartilmaameedka</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Diiwaan ma jiro.</TableCell>
              </TableRow>
            ) : (
              data.items.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(l.createdAt)} {new Date(l.createdAt).toISOString().slice(11, 16)}
                  </TableCell>
                  <TableCell>
                    {l.actor} <span className="text-xs text-muted-foreground">({ROLE_LABELS[l.actorRole as Role] ?? l.actorRole})</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {l.targetType}
                    {l.targetId ? `:${l.targetId.slice(-6)}` : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/audit" />
    </div>
  );
}
