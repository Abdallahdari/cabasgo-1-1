import { Sidebar, buildNav } from "@/components/layout/sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { NavLinks } from "@/components/layout/nav-links";
import { getCurrentUser } from "@/server/auth/current-user";
import { unreadNotificationCount } from "@/server/services/notification.service";
import { getPlatformStats, getUserStats } from "@/server/services/complaint.service";
import { can } from "@/server/authz/permissions";
import { countPublishedBy, listRegions } from "@/server/services/catalog.service";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const staff = can(user?.role, "complaint:moderate");
  const [unread, stats, regions, regionCounts, platform] = await Promise.all([
    user ? unreadNotificationCount(user.id) : 0,
    user ? getUserStats(user.id) : null,
    listRegions(),
    countPublishedBy("regionId", 50),
    staff ? getPlatformStats() : null,
  ]);
  const topRegions = regions
    .map((r) => ({ ...r, count: regionCounts.get(r.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const bottomNav = buildNav(user, unread).filter((i) =>
    ["/", "/complaints/new", "/me/complaints", "/notifications", "/settings", "/login"].includes(i.href),
  );

  return (
    <div className="min-h-dvh">
      <SiteHeader user={user} unread={unread} />
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 lg:gap-8 lg:px-8">
        <Sidebar user={user} unread={unread} stats={stats} regions={topRegions} pendingReview={platform?.pending ?? 0} />
        <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-10">
          {children}
        </main>
      </div>
      {user ? (
        <nav
          aria-label="Hagaha mobilka"
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <NavLinks items={bottomNav} variant="bottom" />
        </nav>
      ) : null}
    </div>
  );
}
