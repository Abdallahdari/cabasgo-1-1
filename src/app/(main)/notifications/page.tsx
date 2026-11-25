import type { Metadata } from "next";
import { requirePageUser } from "@/server/auth/current-user";
import { listNotifications, unreadNotificationCount } from "@/server/services/notification.service";
import { NotificationsList } from "@/components/notifications-list";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Ogeysiisyo" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const user = await requirePageUser("/notifications");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const [data, unread] = await Promise.all([listNotifications(user.id, page, 20), unreadNotificationCount(user.id)]);

  return (
    <PageShell title="Ogeysiisyo" description="Wararka cusub ee cabashooyinka aad gudbisay ama raacayso.">
      {data.items.length === 0 ? (
        <EmptyState title="Ogeysiis ma jiro." description="Marka cabasho aad raacayso la cusbooneysiiyo, halkan ayaad ka arki doontaa." />
      ) : (
        <div className="space-y-4">
          <NotificationsList items={data.items} unread={unread} />
          <Pagination page={data.page} totalPages={data.totalPages} basePath="/notifications" />
        </div>
      )}
    </PageShell>
  );
}
