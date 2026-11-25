import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/current-user";
import { listInvitations } from "@/server/services/invitation.service";
import { InvitationsPanel } from "@/components/admin/invitations-panel";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Casuumadaha" };

export default async function InvitationsPage({ searchParams }: PageProps<"/admin/invitations">) {
  const user = await requirePagePermission("invitation:manage", "/admin/invitations");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const data = await listInvitations(user, page, 20);
  return (
    <div className="space-y-4">
      <InvitationsPanel invitations={data.items} />
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/invitations" />
    </div>
  );
}
