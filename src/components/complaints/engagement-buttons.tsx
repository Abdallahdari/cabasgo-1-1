"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowBigUp } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function useAuthRedirect() {
  const router = useRouter();
  return (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toast.error(errorMessage(err));
  };
}

export function LikeButton({
  complaintId,
  initialLiked,
  initialCount,
  disabled,
  variant = "bar",
}: {
  complaintId: string;
  initialLiked: boolean;
  initialCount: number;
  disabled?: boolean;
  /** "rail": vertical support column beside a post; "bar": inline pill in an action row. */
  variant?: "bar" | "rail";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const onError = useAuthRedirect();

  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      try {
        const res = await api<{ active: boolean; count: number }>(`/api/complaints/${complaintId}/like`, {
          method: next ? "PUT" : "DELETE",
        });
        setLiked(res.active);
        setCount(res.count);
      } catch (err) {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
        onError(err);
      }
    });
  }

  const label = liked ? "Ka noqo taageerada" : "Taageer cabashadan";

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending || disabled}
        aria-pressed={liked}
        aria-label={`${label} (${count})`}
        className={cn(
          "group flex w-full flex-col items-center gap-0.5 rounded-md py-1.5 text-[13px] font-bold transition-colors disabled:opacity-60",
          liked ? "text-support" : "text-foreground/80 hover:text-support",
        )}
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            liked ? "bg-support-soft" : "group-hover:bg-support-soft",
          )}
        >
          <ArrowBigUp className={cn("size-6 transition-transform group-active:-translate-y-0.5", liked && "fill-support")} aria-hidden />
        </span>
        <span className="tabular">{compactNumber(count)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || disabled}
      aria-pressed={liked}
      aria-label={`${label} (${count})`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full pr-3.5 pl-2 text-sm font-semibold transition-colors disabled:opacity-60",
        liked ? "bg-support-soft text-support" : "bg-muted text-foreground/80 hover:bg-support-soft hover:text-support",
      )}
    >
      <ArrowBigUp className={cn("size-5", liked && "fill-support")} aria-hidden />
      <span>Taageer</span>
      <span className="tabular">{compactNumber(count)}</span>
    </button>
  );
}

export function FollowButton({
  complaintId,
  initialFollowing,
  variant = "link",
}: {
  complaintId: string;
  initialFollowing: boolean;
  variant?: "link" | "button";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const onError = useAuthRedirect();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        await api(`/api/complaints/${complaintId}/follow`, { method: next ? "PUT" : "DELETE" });
        toast.success(next ? "Waad raacaysaa cabashadan. Ogeysiis ayaad heli doontaa." : "Raacitaanka waa la joojiyay.");
      } catch (err) {
        setFollowing(!next);
        onError(err);
      }
    });
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        className={cn(
          "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60",
          following ? "bg-secondary text-secondary-foreground hover:bg-secondary/70" : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {following ? "Waad raacaysaa" : "Raac cabashada"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold transition-colors disabled:opacity-60", following ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90")}
    >
      {following ? "Waad raacaysaa" : "+ Raac"}
    </button>
  );
}
