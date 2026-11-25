"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BadgeCheck, Bell, CheckCheck, EyeOff, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/constants";
import type { NotificationDTO } from "@/types";

const ICON: Record<NotificationType, typeof Bell> = {
  COMPLAINT_PUBLISHED: BadgeCheck,
  COMPLAINT_REJECTED: XCircle,
  COMPLAINT_HIDDEN: EyeOff,
  STATUS_CHANGED: RefreshCw,
  NEW_COMMENT: MessageCircle,
  OFFICIAL_RESPONSE: BadgeCheck,
};

export function NotificationsList({ items, unread }: { items: NotificationDTO[]; unread: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      try {
        await api("/api/notifications/read", { method: "POST", body: {} });
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  function markOne(id: string) {
    api("/api/notifications/read", { method: "POST", body: { ids: [id] } }).catch(() => undefined);
  }

  return (
    <div className="rounded-3xl bg-card p-3 sm:p-6">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">{unread} aan la akhrin</p>
        <Button variant="ghost" onClick={markAll} disabled={pending || unread === 0} className="rounded-xl">
          <CheckCheck aria-hidden /> Dhammaan u calaamadee la akhriyay
        </Button>
      </div>
      <ul className="divide-y">
        {items.map((n) => {
          const Icon = ICON[n.type] ?? Bell;
          const content = (
            <div className={cn("flex gap-4 rounded-2xl p-3 transition-colors hover:bg-muted", !n.read && "bg-secondary/60")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                {n.body ? <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p> : null}
                <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read ? <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" aria-label="Cusub" /> : null}
            </div>
          );
          return (
            <li key={n.id} className="py-1">
              {n.complaintId ? (
                <Link href={`/complaints/${n.complaintId}`} onClick={() => !n.read && markOne(n.id)}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
