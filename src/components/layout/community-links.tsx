"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CategoryTile } from "@/components/complaints/category-icon";
import { cn } from "@/lib/utils";

export type CommunityLink = { id: string; name: string; icon: string; color: string; count: number };

/** Categories rendered as feed "communities", with the active filter highlighted. */
export function CommunityLinks({ items }: { items: CommunityLink[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = pathname === "/" ? params.get("categoryId") : null;

  return (
    <ul className="space-y-0.5">
      {items.map((c) => {
        const on = active === c.id;
        return (
          <li key={c.id}>
            <Link
              href={on ? "/" : `/?categoryId=${c.id}`}
              aria-current={on ? "true" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                on ? "bg-secondary font-semibold text-secondary-foreground" : "font-medium text-foreground/85 hover:bg-background",
              )}
            >
              <CategoryTile icon={c.icon} color={c.color} className="size-6 rounded-full [&_svg]:size-3.5" />
              <span className="flex-1 truncate">{c.name}</span>
              {c.count > 0 ? (
                <span className="tabular text-xs text-muted-foreground">{c.count > 999 ? "999+" : c.count}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
