import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pagination using query string links. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const linkCls = "inline-flex h-10 items-center gap-1 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-muted";
  return (
    <nav className="flex items-center justify-between gap-2 pt-2" aria-label="Bogag">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkCls} rel="prev">
          <ChevronLeft className="size-4" aria-hidden /> Kuwii hore
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        Bogga {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={cn(linkCls)} rel="next">
          Kuwa xiga <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
