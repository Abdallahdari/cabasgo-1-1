import { Sidebar, buildNav } from "@/components/layout/sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { NavLinks } from "@/components/layout/nav-links";
import { getCurrentUser } from "@/server/auth/current-user";
import { unreadNotificationCount } from "@/server/services/notification.service";
import { getPlatformStats } from "@/server/services/complaint.service";
import { can } from "@/server/authz/permissions";
import { countPublishedBy, listCategories } from "@/server/services/catalog.service";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const staff = can(user?.role, "complaint:moderate");
  const [unread, categories, categoryCounts, platform] = await Promise.all([
    user ? unreadNotificationCount(user.id) : 0,
    listCategories(),
    countPublishedBy("categoryId", 50),
    staff ? getPlatformStats() : null,
  ]);
  const communities = categories
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, count: categoryCounts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const bottomNav = buildNav(user, unread).filter((i) =>
    ["/", "/complaints/new", "/me/complaints", "/notifications", "/settings"].includes(i.href),
  );

  return (
    <div className="min-h-dvh">
      <SiteHeader user={user} unread={unread} />
      <div className="mx-auto flex max-w-[1320px] gap-5 px-3 lg:gap-6 lg:px-5">
        <Sidebar user={user} unread={unread} categories={communities} pendingReview={platform?.pending ?? 0} />
        <main id="main" className="min-w-0 flex-1 pt-4 pb-24 lg:pb-10">
          {children}
        </main>
      </div>
      {user ? (
        <nav
          aria-label="Hagaha mobilka"
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <NavLinks items={bottomNav} variant="bottom" />
        </nav>
      ) : null}
    </div>
  );
}
