import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/server/auth/session";

export function SiteHeader({ user, unread, q }: { user: SessionUser | null; unread: number; q?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-3 sm:gap-4 lg:px-5">
        <div className="hidden w-[240px] shrink-0 lg:block">
          <Brand />
        </div>
        <Link href="/" className="lg:hidden" aria-label="Bogga hore">
          <BrandMark />
        </Link>

        <form action="/" method="get" role="search" className="mx-auto w-full max-w-[600px] flex-1">
          <label htmlFor="site-search" className="sr-only">
            Raadi cabashooyin
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="site-search"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={100}
              placeholder="Raadi cabashooyin, goobo ama qaybo…"
              className="h-10 w-full rounded-full border border-transparent bg-muted pr-4 pl-10 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-input focus:border-primary focus:bg-background"
            />
          </div>
        </form>

        {user ? (
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/complaints/new"
              className="hidden h-10 items-center gap-1.5 rounded-full bg-primary pr-4 pl-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
            >
              <Plus className="size-[18px]" aria-hidden />
              Cabasho cusub
            </Link>
            <Link
              href="/notifications"
              className="relative flex size-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={unread ? `Ogeysiisyo (${unread} cusub)` : "Ogeysiisyo"}
            >
              <Bell className="size-[22px]" aria-hidden />
              {unread > 0 ? (
                <span className="tabular absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white ring-2 ring-background">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <UserMenu name={user.name} role={user.role} />
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="h-10 rounded-full px-4">
              <Link href="/login">Gal</Link>
            </Button>
            <Button asChild className="hidden h-10 rounded-full px-5 sm:inline-flex">
              <Link href="/register">Is diiwaangeli</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
