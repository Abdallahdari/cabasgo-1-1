"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  FileText,
  House,
  type LucideIcon,
  Settings,
  ShieldCheck,
  SquarePen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: House,
  new: SquarePen,
  mine: FileText,
  following: Bookmark,
  notifications: Bell,
  admin: ShieldCheck,
  settings: Settings,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function NavLinks({ items, variant = "sidebar" }: { items: NavItem[]; variant?: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (variant === "bottom") {
    return (
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium",
                  active ? "text-primary after:absolute after:inset-x-5 after:top-0 after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-[22px]" aria-hidden />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors",
                active
                  ? "bg-secondary font-semibold text-secondary-foreground"
                  : "font-medium text-foreground/85 hover:bg-background hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="tabular min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] leading-5 font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
