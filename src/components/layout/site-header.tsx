import Link from "next/link";
import { Bell, Search, SquarePen } from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/server/auth/session";

export function SiteHeader({ user, unread, q }: { user: SessionUser | null; unread: number; q?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-4 px-4 lg:h-[88px] lg:px-8">
        <div className="hidden w-[248px] shrink-0 lg:block">
          <Brand />
        </div>
        <Link href="/" className="lg:hidden" aria-label="Bogga hore">
          <BrandMark />
        </Link>

        <form action="/" method="get" role="search" className="ml-auto w-full max-w-sm lg:ml-[100px] lg:max-w-md xl:ml-auto xl:mr-6">
          <label htmlFor="site-search" className="sr-only">
            Raadi cabashooyin
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="site-search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="Raadi cabashooyin, goobo ama qaybo…"
              className="h-12 w-full rounded-xl border border-transparent bg-canvas pr-4 pl-12 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-3 focus:ring-primary/15"
            />
          </div>
        </form>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/complaints/new"
              className="hidden size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
              aria-label="Cabasho cusub"
            >
              <SquarePen className="size-6" aria-hidden />
            </Link>
            <Link
              href="/notifications"
              className="relative flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={unread ? `Ogeysiisyo (${unread} cusub)` : "Ogeysiisyo"}
            >
              <Bell className="size-6" aria-hidden />
              {unread > 0 ? (
                <span className="absolute -top-0.5 right-0 flex min-w-[22px] items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[11px] leading-[18px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <UserMenu name={user.name} role={user.role} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="lg" className="h-11 px-4">
              <Link href="/login">Gal</Link>
            </Button>
            <Button asChild size="lg" className="h-11 rounded-xl px-5">
              <Link href="/register">Is diiwaangeli</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
