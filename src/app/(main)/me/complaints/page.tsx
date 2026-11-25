import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/server/auth/current-user";
import { listMyComplaints } from "@/server/services/complaint.service";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Cabashooyinkayga" };

export default async function MyComplaintsPage({ searchParams }: PageProps<"/me/complaints">) {
  const user = await requirePageUser("/me/complaints");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const data = await listMyComplaints(user, page, 10);

  return (
    <PageShell
      title="Cabashooyinkayga"
      description="Dhammaan cabashooyinka aad gudbisay, oo ay ku jiraan kuwa qarsoodiga ah iyo kuwa sugaya dib-u-eegis."
      actions={
        <Link
          href="/complaints/new"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Cabasho cusub
        </Link>
      }
    >
      {data.items.length === 0 ? (
        <EmptyState title="Weli cabasho ma aadan gudbin." description="Marka aad gudbiso, halkan ayaad kala socon kartaa." />
      ) : (
        <div className="space-y-6">
          {data.items.map((c) => (
            <ComplaintCard key={c.id} complaint={c} signedIn showVisibility />
          ))}
          <Pagination page={data.page} totalPages={data.totalPages} basePath="/me/complaints" />
        </div>
      )}
    </PageShell>
  );
}
