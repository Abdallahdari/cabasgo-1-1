import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/server/auth/current-user";
import { listReports } from "@/server/services/report.service";
import { ReportsTable } from "@/components/admin/reports-table";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";
import { REPORT_STATUSES, type ReportStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Warbixinnada" };

const LABELS: Record<ReportStatus, string> = { OPEN: "Furan", RESOLVED: "La xaliyay", DISMISSED: "La iska dhaafay" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const user = await requirePagePermission("report:review", "/admin/reports");
  const sp = await searchParams;
  const status = (REPORT_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as ReportStatus) : "OPEN";
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const data = await listReports(user, status, page, 20);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {REPORT_STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "OPEN" ? "/admin/reports" : `/admin/reports?status=${s}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              s === status ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[s]}
          </Link>
        ))}
      </div>
      <ReportsTable reports={data.items} />
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/reports" params={{ status: status === "OPEN" ? undefined : status }} />
    </div>
  );
}
