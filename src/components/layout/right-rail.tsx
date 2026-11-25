import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CategoryTile } from "@/components/complaints/category-icon";
import { timeAgo } from "@/lib/format";
import { listCategories, countPublishedBy } from "@/server/services/catalog.service";
import { listPublicComplaints } from "@/server/services/complaint.service";
import { cn } from "@/lib/utils";

export async function RightRail({ activeCategoryId }: { activeCategoryId?: string }) {
  const [categories, counts, resolved] = await Promise.all([
    listCategories(),
    countPublishedBy("categoryId", 50),
    listPublicComplaints({ page: 1, pageSize: 4, sort: "new", status: "RESOLVED" }, null),
  ]);
  const ranked = categories
    .map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.order - b.order);

  return (
    <aside className="hidden w-[300px] shrink-0 space-y-9 pt-2 xl:block" aria-label="Macluumaad dheeraad ah">
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Qaybaha cabashooyinka</h2>
        <ul className="space-y-2">
          {ranked.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link
                href={activeCategoryId === c.id ? "/" : `/?categoryId=${c.id}`}
                className={cn(
                  "flex items-center gap-3.5 rounded-2xl p-1.5 pr-2 transition-colors hover:bg-muted",
                  activeCategoryId === c.id && "bg-secondary",
                )}
                aria-current={activeCategoryId === c.id ? "true" : undefined}
              >
                <CategoryTile icon={c.icon} color={c.color} />
                <span className="flex-1 truncate text-[15px] font-medium">{c.name}</span>
                {c.count > 0 ? (
                  <span className="flex min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs leading-6 font-bold text-white">
                    {c.count > 99 ? "99+" : c.count}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Dhawaan la xaliyay</h2>
        {resolved.items.length === 0 ? (
          <p className="rounded-2xl bg-canvas p-4 text-sm text-muted-foreground">
            Weli cabasho la xaliyay ma jirto. Marka tifaftireyaashu xaliyaan, halkan ayay ka muuqan doontaa.
          </p>
        ) : (
          <ul className="space-y-4">
            {resolved.items.map((c) => (
              <li key={c.id}>
                <Link href={`/complaints/${c.id}`} className="group flex items-start gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{c.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.city.name} · {c.resolvedAt ? timeAgo(c.resolvedAt) : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
