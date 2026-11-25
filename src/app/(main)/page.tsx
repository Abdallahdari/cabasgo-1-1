import Link from "next/link";
import { Bell, EyeOff, ImagePlus, MapPin, Tags } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPlatformStats, listPublicComplaints } from "@/server/services/complaint.service";
import { listCategories, listRegions } from "@/server/services/catalog.service";
import { listComplaintsQuery } from "@/lib/validation";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { RightRail } from "@/components/layout/right-rail";
import { Pagination } from "@/components/pagination";
import { UserAvatar } from "@/components/user-avatar";
import { BrandMark } from "@/components/brand";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { can } from "@/server/authz/permissions";

const TABS = [
  { key: "all", label: "Dhammaan", query: {} },
  { key: "top", label: "Ugu taageerada badan", query: { sort: "top" } },
  { key: "progress", label: "Shaqo socota", query: { status: "IN_PROGRESS" } },
  { key: "resolved", label: "La xaliyay", query: { status: "RESOLVED" } },
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
  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (key !== "all") p.set("tab", key);
    for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1 space-y-6 rounded-[28px] bg-canvas p-3 sm:p-6 lg:p-8">
        {can(user?.role, "complaint:moderate") && stats.pending > 0 ? (
          <Link
            href="/admin"
            className="flex items-center gap-4 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 transition-colors hover:bg-amber-100 sm:p-6"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-lg font-bold text-white">
              {stats.pending}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-amber-950">
                {stats.pending} cabasho ayaa sugaya ansixintaada
              </span>
              <span className="block text-sm text-amber-900/80">
                Dadweynaha ma arkaan ilaa aad ansixiso. Hubi qoraalka iyo sawirrada (anshax xumo, galmo, af-lagaado).
              </span>
            </span>
            <span className="hidden shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white sm:block">
              Dib u eeg hadda
            </span>
          </Link>
        ) : null}

        {/* Cover card */}
        <section className="overflow-hidden rounded-3xl bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]" aria-labelledby="hero-title">
          <div className="relative p-2 pb-0">
            <div className="relative h-36 overflow-hidden rounded-2xl bg-[#1d3f9a] sm:h-48" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#4f8cff_0,transparent_45%),radial-gradient(circle_at_85%_30%,#22c1ee_0,transparent_40%),radial-gradient(circle_at_60%_110%,#7c3aed_0,transparent_45%)] opacity-90" />
              <svg className="absolute inset-0 h-full w-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              <div className="absolute right-6 bottom-5 hidden max-w-xs text-right text-white/90 sm:block">
                <p className="text-sm font-semibold">Cod kasta waa la maqlayaa.</p>
                <p className="text-xs text-white/70">Ka warbixi · La soco · Arag xalka</p>
              </div>
            </div>
          </div>
          <div className="px-5 pb-0 sm:px-8">
            <div className="relative z-10 -mt-9 flex items-end justify-between sm:-mt-11">
              <div className="flex items-end gap-4">
                <div className="rounded-2xl bg-card p-1.5">
                  <BrandMark className="size-16 rounded-xl sm:size-20 [&_svg]:size-9" />
                </div>
                <p className="mb-2 hidden text-xs text-muted-foreground sm:block">Madal dadweyne oo furan</p>
              </div>
              <Link
                href="/notifications"
                className="mb-1 flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                aria-label="Ogeysiisyada"
              >
                <Bell className="size-5" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 id="hero-title" className="text-2xl font-bold tracking-tight sm:text-[28px]">
                  Codka Bulshada
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Cabashooyinka bulshada <span aria-hidden>•</span> {compactNumber(stats.published)} la daabacay
                </p>
              </div>
              <dl className="flex gap-6 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Shaqo socota</dt>
                  <dd className="font-bold text-amber-600">{compactNumber(stats.inProgress)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">La xaliyay</dt>
                  <dd className="font-bold text-emerald-600">{compactNumber(stats.resolved)}</dd>
                </div>
              </dl>
            </div>
            <nav className="-mx-5 mt-6 overflow-x-auto border-t sm:-mx-8" aria-label="Kala sooc cabashooyinka">
              <ul className="flex min-w-max gap-2 px-5 sm:gap-6 sm:px-8">
                {TABS.map((t) => {
                  const active = t.key === tab.key;
                  return (
                    <li key={t.key}>
                      <Link
                        href={tabHref(t.key)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative block px-3 py-4 text-[15px] font-medium transition-colors",
                          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t.label}
                        {active ? <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-primary" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </section>

        {/* Composer */}
        <section className="rounded-3xl bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-8" aria-label="Gudbi cabasho">
          <div className="flex items-center gap-4">
            <UserAvatar name={user?.name} anonymous={!user} size={52} />
            <Link
              href={user ? "/complaints/new" : "/login?next=/complaints/new"}
              className="flex h-14 flex-1 items-center rounded-xl bg-canvas px-5 text-[15px] text-muted-foreground transition-colors hover:bg-muted"
            >
              Maxaad jeclaan lahayd inaad ka warbixiso?
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-around sm:pl-16">
            {[
              { href: "/complaints/new#sawirro", icon: ImagePlus, label: "Sawir" },
              { href: "/complaints/new#goobta", icon: MapPin, label: "Goobta" },
              { href: "/complaints/new#qaybta", icon: Tags, label: "Qaybta" },
              { href: "/complaints/new?anonymous=1", icon: EyeOff, label: "Qarsoodi" },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={label}
                href={user ? href : `/login?next=${encodeURIComponent(href)}`}
                className="inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </section>

        {(activeCategory || activeRegion || query.q) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Shaandhayn:</span>
            {activeCategory ? <span className="rounded-full bg-card px-3 py-1 font-medium">{activeCategory.name}</span> : null}
            {activeRegion ? <span className="rounded-full bg-card px-3 py-1 font-medium">{activeRegion.name}</span> : null}
            {query.q ? <span className="rounded-full bg-card px-3 py-1 font-medium">“{query.q}”</span> : null}
            <Link href="/" className="font-semibold text-primary hover:underline">
              Tirtir
            </Link>
          </div>
        )}

        {feed.items.length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center">
            <p className="text-lg font-semibold">Cabasho lagama helin halkan.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query.q || activeCategory || activeRegion
                ? "Isku day shaandhayn kale ama ereyo kale."
                : "Noqo qofka ugu horreeya ee ka warbixiya dhibaato bulshada haysata."}
            </p>
            <Link
              href={user ? "/complaints/new" : "/register"}
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Gudbi cabasho
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
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
      <RightRail activeCategoryId={query.categoryId} />
    </div>
  );
}
