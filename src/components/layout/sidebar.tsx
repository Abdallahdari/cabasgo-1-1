import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { NavLinks, type NavItem } from "@/components/layout/nav-links";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { compactNumber } from "@/lib/format";
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

type RegionLink = { id: string; name: string; count: number };

export function Sidebar({
  user,
  unread,
  stats,
  regions,
  pendingReview = 0,
}: {
  user: SessionUser | null;
  unread: number;
  pendingReview?: number;
  stats: { submitted: number; resolved: number; following: number } | null;
  regions: RegionLink[];
}) {
  return (
    <aside className="sticky top-[88px] hidden h-[calc(100dvh-88px)] w-[248px] shrink-0 flex-col gap-8 overflow-y-auto pt-2 pb-8 lg:flex">
      {user && stats ? (
        <div className="rounded-2xl bg-canvas p-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-semibold">
                <span className="truncate">{user.name}</span>
                {user.role !== "CITIZEN" ? <BadgeCheck className="size-4 shrink-0 fill-primary text-white" aria-label="Shaqaale la xaqiijiyay" /> : null}
              </div>
              <div className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 text-center">
            {[
              ["Cabasho", stats.submitted],
              ["La xaliyay", stats.resolved],
              ["Raacid", stats.following],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dd className="font-bold">{compactNumber(value as number)}</dd>
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="rounded-2xl bg-canvas p-5">
          <p className="font-semibold">Codkaagu waa muhiim.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ka warbixi dhibaatooyinka adeegyada dadweynaha, la soco xalintooda.
          </p>
          <Button asChild className="mt-4 h-10 w-full rounded-xl">
            <Link href="/register">Bilow hadda</Link>
          </Button>
        </div>
      )}

      <nav aria-label="Hagaha ugu weyn">
        <NavLinks items={buildNav(user, unread, pendingReview)} />
      </nav>

      {regions.length > 0 ? (
        <div>
          <h2 className="mb-3 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Gobollada</h2>
          <ul className="space-y-1">
            {regions.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/?regionId=${r.id}`}
                  className="flex items-center gap-3 rounded-xl px-1 py-2 text-sm font-medium hover:bg-muted"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                    {r.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
