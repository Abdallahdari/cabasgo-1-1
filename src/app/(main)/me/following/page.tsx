import type { Metadata } from "next";
import { requirePageUser } from "@/server/auth/current-user";
import { listFollowedComplaints } from "@/server/services/complaint.service";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Kuwa aan raaco" };

export default async function FollowingPage({ searchParams }: PageProps<"/me/following">) {
  const user = await requirePageUser("/me/following");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const data = await listFollowedComplaints(user, page, 10);

  return (
    <PageShell title="Kuwa aan raaco" description="Cabashooyinka aad raacayso — waxaad helaysaa ogeysiis marka xaaladdu isbeddesho.">
      {data.items.length === 0 ? (
        <EmptyState title="Ma raacaysid wax cabasho ah." description="Riix “Raac” cabasho kasta si aad u hesho wararkeeda." />
      ) : (
        <div className="space-y-6">
          {data.items.map((c) => (
            <ComplaintCard key={c.id} complaint={c} signedIn />
          ))}
          <Pagination page={data.page} totalPages={data.totalPages} basePath="/me/following" />
        </div>
      )}
    </PageShell>
  );
}
