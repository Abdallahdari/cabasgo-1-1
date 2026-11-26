import Link from "next/link";
import { CircleCheck, Clock3, EyeOff, Hammer, ImagePlus, MapPin, ShieldAlert, Tags, TrendingUp, X } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPlatformStats, listPublicComplaints } from "@/server/services/complaint.service";
import { listCategories, listRegions } from "@/server/services/catalog.service";
import { listComplaintsQuery } from "@/lib/validation";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { RightRail } from "@/components/layout/right-rail";
import { Pagination } from "@/components/pagination";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { can } from "@/server/authz/permissions";

const TABS = [
  { key: "all", label: "Dhammaan", icon: Clock3, query: {} },
  { key: "top", label: "Ugu taageerada badan", icon: TrendingUp, query: { sort: "top" } },
  { key: "progress", label: "Shaqo socota", icon: Hammer, query: { status: "IN_PROGRESS" } },
  { key: "resolved", label: "La xaliyay", icon: CircleCheck, query: { status: "RESOLVED" } },
] as const;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const tabKey = typeof sp.tab === "string" ? sp.tab : "all";
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];
  const raw = Object.fromEntries(
    Object.entries(sp).filter(([k, v]) => typeof v === "string" && ["page", "categoryId", "regionId", "q"].includes(k)),
  );
  const parsed = listComplaintsQuery.safeParse({ ...raw, ...tab.query });
  const query = parsed.success ? parsed.data : listComplaintsQuery.parse({});

  const user = await getCurrentUser();
  const [feed, stats, categories, regions] = await Promise.all([
    listPublicComplaints(query, user),
    getPlatformStats(),
    listCategories(),
    listRegions(),
  ]);
  const activeCategory = categories.find((c) => c.id === query.categoryId);
  const activeRegion = regions.find((r) => r.id === query.regionId);
  const filters = { categoryId: query.categoryId, regionId: query.regionId, q: query.q };
  const hrefWith = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tab: tab.key === "all" ? undefined : tab.key, ...filters, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };
  const tabHref = (key: string) => hrefWith({ tab: key === "all" ? undefined : key });
  const hasFilters = Boolean(activeCategory || activeRegion || query.q);

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-3">
        {can(user?.role, "complaint:moderate") && stats.pending > 0 ? (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg border border-[#f0cf9a] bg-[#fff8ec] p-3 transition-colors hover:bg-[#fff1d9] sm:p-4"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#b45309] text-white">
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-[#5c2d05]">
                {stats.pending} cabasho ayaa sugaya ansixintaada
              </span>
              <span className="block text-[13px] leading-5 text-[#7a3d07]">
                Dadweynaha ma arkaan ilaa aad ansixiso. Hubi qoraalka iyo sawirrada (anshax xumo, galmo, af-lagaado).
              </span>
            </span>
            <span className="hidden h-9 shrink-0 items-center rounded-full bg-[#b45309] px-4 text-sm font-semibold text-white sm:inline-flex">
              Dib u eeg hadda
            </span>
          </Link>
        ) : null}

        {/* Composer */}
        <section className="rounded-lg border bg-card px-3 pt-3 pb-1.5 sm:px-4" aria-label="Gudbi cabasho">
          <div className="flex items-center gap-3">
            <UserAvatar name={user?.name} anonymous={!user} size={40} />
            <Link
              href={user ? "/complaints/new" : "/login?next=/complaints/new"}
              className="flex h-10 flex-1 items-center rounded-full bg-muted px-4 text-[15px] text-muted-foreground transition-colors hover:bg-[#e3e7ed]"
            >
              Maxaad jeclaan lahayd inaad ka warbixiso?
            </Link>
          </div>
          <div className="mt-2 grid grid-cols-4 border-t pt-1.5">
            {[
              { href: "/complaints/new#sawirro", icon: ImagePlus, label: "Sawir", tone: "text-[#17803d]" },
              { href: "/complaints/new#goobta", icon: MapPin, label: "Goobta", tone: "text-[#d42f2f]" },
              { href: "/complaints/new#qaybta", icon: Tags, label: "Qaybta", tone: "text-[#1a5db5]" },
              { href: "/complaints/new?anonymous=1", icon: EyeOff, label: "Qarsoodi", tone: "text-[#6d3fc0]" },
            ].map(({ href, icon: Icon, label, tone }) => (
              <Link
                key={label}
                href={user ? href : `/login?next=${encodeURIComponent(href)}`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold text-foreground/75 transition-colors hover:bg-muted"
              >
                <Icon className={cn("size-5", tone)} aria-hidden />
                <span className="hidden min-[380px]:inline">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Sort bar */}
        <nav className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-card p-1.5" aria-label="Kala sooc cabashooyinka">
          {TABS.map((t) => {
            const active = t.key === tab.key;
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                  active ? "bg-secondary text-secondary-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
            <span className="text-muted-foreground">Shaandhayn:</span>
            {activeCategory ? (
              <Link href={hrefWith({ categoryId: undefined, page: undefined })} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pr-2 pl-3 font-medium hover:bg-muted">
                {activeCategory.name} <X className="size-3.5 text-muted-foreground" aria-label="Ka saar" />
              </Link>
            ) : null}
            {activeRegion ? (
              <Link href={hrefWith({ regionId: undefined, page: undefined })} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pr-2 pl-3 font-medium hover:bg-muted">
                {activeRegion.name} <X className="size-3.5 text-muted-foreground" aria-label="Ka saar" />
              </Link>
            ) : null}
            {query.q ? (
              <Link href={hrefWith({ q: undefined, page: undefined })} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pr-2 pl-3 font-medium hover:bg-muted">
                “{query.q}” <X className="size-3.5 text-muted-foreground" aria-label="Ka saar" />
              </Link>
            ) : null}
            <Link href="/" className="font-semibold text-primary hover:underline">
              Tirtir
            </Link>
          </div>
        )}

        {feed.items.length === 0 ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <p className="text-lg font-bold">Cabasho lagama helin halkan.</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {hasFilters
                ? "Isku day shaandhayn kale ama ereyo kale."
                : "Noqo qofka ugu horreeya ee ka warbixiya dhibaato bulshada haysata."}
            </p>
            <Link
              href={user ? "/complaints/new" : "/register"}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Gudbi cabasho
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.items.map((c) => (
              <ComplaintCard key={c.id} complaint={c} signedIn={Boolean(user)} />
            ))}
          </div>
        )}
        <Pagination
          page={feed.page}
          totalPages={feed.totalPages}
          basePath="/"
          params={{ ...filters, tab: tab.key === "all" ? undefined : tab.key }}
        />
      </div>
      <RightRail activeRegionId={query.regionId} stats={stats} signedIn={Boolean(user)} />
    </div>
  );
}
