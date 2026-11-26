import { Suspense } from "react";
import Link from "next/link";
import { NavLinks, type NavItem } from "@/components/layout/nav-links";
import { CommunityLinks, type CommunityLink } from "@/components/layout/community-links";
import type { SessionUser } from "@/server/auth/session";

export function buildNav(user: SessionUser | null, unread: number, pendingReview = 0): NavItem[] {
  const items: NavItem[] = [{ href: "/", label: "Bogga hore", icon: "home" }];
  if (user) {
    items.push(
      { href: "/complaints/new", label: "Cabasho cusub", icon: "new" },
      { href: "/me/complaints", label: "Cabashooyinkayga", icon: "mine" },
      { href: "/me/following", label: "Kuwa aan raaco", icon: "following" },
      { href: "/notifications", label: "Ogeysiisyo", icon: "notifications", badge: unread },
    );
    if (user.role !== "CITIZEN") items.push({ href: "/admin", label: "Maamulka", icon: "admin", badge: pendingReview });
    items.push({ href: "/settings", label: "Dejinta", icon: "settings" });
  }
  return items;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1 px-3 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{children}</h2>;
}

export function Sidebar({
  user,
  unread,
  categories,
  pendingReview = 0,
}: {
  user: SessionUser | null;
  unread: number;
  pendingReview?: number;
  categories: CommunityLink[];
}) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[240px] shrink-0 flex-col overflow-y-auto py-4 [scrollbar-width:none] hover:[scrollbar-width:thin] lg:flex">
      <nav aria-label="Hagaha ugu weyn">
        <NavLinks items={buildNav(user, unread, pendingReview)} />
      </nav>

      {categories.length > 0 ? (
        <div className="mt-4 border-t pt-4">
          <SectionTitle>Qaybaha</SectionTitle>
          <Suspense fallback={null}>
            <CommunityLinks items={categories} />
          </Suspense>
        </div>
      ) : null}

      {!user ? (
        <div className="mt-4 border-t px-3 pt-4">
          <p className="text-sm font-semibold">Codkaagu waa muhiim.</p>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            Ka warbixi dhibaatooyinka adeegyada dadweynaha, la soco xalintooda.
          </p>
          <Link
            href="/register"
            className="mt-3 flex h-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Bilow hadda
          </Link>
        </div>
      ) : null}

      <p className="mt-auto px-3 pt-6 text-xs leading-5 text-muted-foreground">
        Codka Bulshada · Madal dadweyne oo furan
      </p>
    </aside>
  );
}
