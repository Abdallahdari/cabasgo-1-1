import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/current-user";
import { listModerationQueue } from "@/server/services/complaint.service";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { EmptyState } from "@/components/page-shell";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Dib-u-eegis" };

export default async function ModerationPage({ searchParams }: PageProps<"/admin">) {
  const user = await requirePagePermission("complaint:moderate", "/admin");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const data = await listModerationQueue(user, page, 10);

  return data.items.length === 0 ? (
    <EmptyState title="Wax sugaya ma jiraan." description="Dhammaan cabashooyinka cusub waa la eegay." />
  ) : (
    <div className="space-y-6">
      <p className="px-2 text-sm text-muted-foreground">{data.total} cabasho ayaa sugaya dib-u-eegis (kuwa ugu da&apos;da weyn marka hore). Fur mid si aad u ansixiso ama u diido.</p>
      {data.items.map((c) => (
        <div key={c.id}>
          <ComplaintCard complaint={c} signedIn showVisibility />
          <ModerationActions complaintId={c.id} imageCount={c.images.length} />
        </div>
      ))}
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin" />
    </div>
  );
}
