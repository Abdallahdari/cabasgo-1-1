import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { compactNumber, timeAgo } from "@/lib/format";
import { countPublishedBy, listRegions } from "@/server/services/catalog.service";
import { listPublicComplaints } from "@/server/services/complaint.service";
import { cn } from "@/lib/utils";

type Stats = { published: number; inProgress: number; resolved: number };

function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      {title ? <h2 className="px-4 pt-3.5 pb-1 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">{title}</h2> : null}
      {children}
    </section>
  );
}

export async function RightRail({ activeRegionId, stats, signedIn }: { activeRegionId?: string; stats: Stats; signedIn: boolean }) {
  const [regions, regionCounts, resolved] = await Promise.all([
    listRegions(),
    countPublishedBy("regionId", 50),
    listPublicComplaints({ page: 1, pageSize: 4, sort: "new", status: "RESOLVED" }, null),
  ]);
  const ranked = regions
    .map((r) => ({ ...r, count: regionCounts.get(r.id) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const max = Math.max(1, ...ranked.map((r) => r.count));
  const resolvedShare = stats.published > 0 ? Math.round((stats.resolved / stats.published) * 100) : 0;

  return (
    <aside className="sticky top-[4.5rem] hidden h-max w-[312px] shrink-0 space-y-3 xl:block" aria-label="Macluumaad dheeraad ah">
      <Panel>
        <div className="h-10 bg-primary" aria-hidden />
        <div className="px-4 pb-4">
          <div className="-mt-5 flex items-end gap-2.5">
            <span className="rounded-[10px] bg-card p-1">
              <BrandMark className="size-10" />
            </span>
            <h2 className="pb-0.5 text-base font-bold">Codka Bulshada</h2>
          </div>
          <p className="mt-2.5 text-sm leading-5 text-foreground/80">
            Ka warbixi dhibaatooyinka adeegyada dadweynaha, una raac ilaa laga xaliyo.
          </p>
          <dl className="mt-4 grid grid-cols-3 border-y py-3">
            {[
              ["La daabacay", stats.published, "text-foreground"],
              ["Shaqo socota", stats.inProgress, "text-[#8a4507]"],
              ["La xaliyay", stats.resolved, "text-[#13652f]"],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="flex flex-col-reverse">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={cn("tabular text-lg font-bold", tone as string)}>{compactNumber(value as number)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Heerka xalinta</span>
              <span className="tabular font-semibold text-foreground">{resolvedShare}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[#1f9a4a]" style={{ width: `${resolvedShare}%` }} />
            </div>
          </div>
          <Link
            href={signedIn ? "/complaints/new" : "/register"}
            className="mt-4 flex h-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Gudbi cabasho
          </Link>
        </div>
      </Panel>

      {ranked.length > 0 ? (
        <Panel title="Gobollada">
          <ul className="px-2 pb-2">
            {ranked.map((r, i) => {
              const on = activeRegionId === r.id;
              return (
                <li key={r.id}>
                  <Link
                    href={on ? "/" : `/?regionId=${r.id}`}
                    aria-current={on ? "true" : undefined}
                    className={cn("block rounded-md px-2 py-2 transition-colors hover:bg-muted", on && "bg-secondary")}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span className="tabular w-4 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold">{r.name}</span>
                      <span className="tabular text-xs text-muted-foreground">{compactNumber(r.count)}</span>
                    </span>
                    <span className="mt-1.5 ml-6 block h-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(r.count / max) * 100}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Dhawaan la xaliyay">
        {resolved.items.length === 0 ? (
          <p className="px-4 pt-1 pb-4 text-sm leading-5 text-muted-foreground">
            Weli cabasho la xaliyay ma jirto. Marka tifaftireyaashu xaliyaan, halkan ayay ka muuqan doontaa.
          </p>
        ) : (
          <ul className="px-2 pb-2">
            {resolved.items.map((c) => (
              <li key={c.id}>
                <Link href={`/complaints/${c.id}`} className="group flex items-start gap-2.5 rounded-md px-2 py-2 hover:bg-muted">
                  <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-[#1f9a4a]" aria-hidden />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm leading-5 font-semibold group-hover:text-primary">{c.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.city.name} · {c.resolvedAt ? timeAgo(c.resolvedAt) : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </aside>
  );
}
