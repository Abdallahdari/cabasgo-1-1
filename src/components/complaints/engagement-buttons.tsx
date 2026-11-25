"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
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
}: {
  complaintId: string;
  initialLiked: boolean;
  initialCount: number;
  disabled?: boolean;
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

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || disabled}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        liked ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <ThumbsUp className={cn("size-[18px]", liked && "fill-primary/20")} aria-hidden />
      <span>Taageer</span>
      <span className="tabular-nums">{compactNumber(count)}</span>
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
          "inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-60",
          following ? "bg-secondary text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90",
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
      className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
    >
      {following ? "Waad raacaysaa" : "Raac"}
    </button>
  );
}
