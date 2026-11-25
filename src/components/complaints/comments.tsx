"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, EyeOff, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { ReportDialog } from "@/components/complaints/report-dialog";
import { api, errorMessage } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommentDTO } from "@/types";

export function CommentsSection({
  complaintId,
  initial,
  canComment,
  canPostOfficial,
  canModerate,
  signedIn,
  commentsOpen,
  needsVerification,
}: {
  complaintId: string;
  initial: CommentDTO[];
  canComment: boolean;
  canPostOfficial: boolean;
  canModerate: boolean;
  signedIn: boolean;
  commentsOpen: boolean;
  needsVerification: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [official, setOfficial] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reporting, setReporting] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        const { comment } = await api<{ comment: CommentDTO }>(`/api/complaints/${complaintId}/comments`, {
          method: "POST",
          body: { body, official },
        });
        setComments((c) => [...c, comment]);
        setBody("");
        setOfficial(false);
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  function toggleHidden(c: CommentDTO) {
    startTransition(async () => {
      try {
        await api(`/api/comments/${c.id}/visibility`, { method: "POST", body: { hidden: !c.hidden } });
        setComments((list) => list.map((x) => (x.id === c.id ? { ...x, hidden: !c.hidden } : x)));
        toast.success(c.hidden ? "Faallada waa la soo celiyay." : "Faallada waa la qariyay.");
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <section id="faallooyin" className="scroll-mt-28 rounded-3xl bg-card p-5 sm:p-8" aria-labelledby="comments-title">
      <h2 id="comments-title" className="text-lg font-bold">
        Faallooyin ({comments.filter((c) => !c.hidden).length})
      </h2>

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Weli faallo lama dhiibin.</p>
      ) : (
        <ol className="mt-5 space-y-5">
          {comments.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex gap-3",
                c.isOfficial && "-mx-3 rounded-2xl bg-secondary/70 p-3",
                c.hidden && "opacity-60",
              )}
            >
              <UserAvatar name={c.author?.name} anonymous={c.isAnonymous || !c.author} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-semibold">
                    {c.isAnonymous ? "Warbixiyaha (qarsoodi)" : (c.author?.name ?? "Muwaadin")}
                  </span>
                  {c.isOfficial ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      <BadgeCheck className="size-3" aria-hidden /> Jawaab rasmi ah
                    </span>
                  ) : c.author && c.author.role !== "CITIZEN" ? (
                    <span className="text-xs text-primary">{ROLE_LABELS[c.author.role]}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  {c.hidden ? <span className="text-xs font-medium text-destructive">· La qariyay</span> : null}
                </div>
                <p className="mt-1 leading-7 whitespace-pre-line">{c.body}</p>
                <div className="mt-1 flex gap-3">
                  {signedIn && !c.isOwnComment && !c.hidden ? (
                    <button
                      type="button"
                      onClick={() => setReporting(c.id)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Flag className="size-3" aria-hidden /> Soo sheeg
                    </button>
                  ) : null}
                  {canModerate ? (
                    <button
                      type="button"
                      onClick={() => toggleHidden(c)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <EyeOff className="size-3" aria-hidden /> {c.hidden ? "Soo celi" : "Qari"}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 border-t pt-6">
        {!commentsOpen ? (
          <p className="text-sm text-muted-foreground">Faallooyinka waa la furi doonaa marka cabashada la daabaco.</p>
        ) : !signedIn ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`/login?next=/complaints/${complaintId}`} className="font-semibold text-primary hover:underline">
              Gal
            </Link>{" "}
            si aad faallo u dhiibato.
          </p>
        ) : needsVerification ? (
          <p className="text-sm text-muted-foreground">
            Xaqiiji email-kaaga si aad faallo u dhiibato.{" "}
            <Link href="/settings#email" className="font-semibold text-primary hover:underline">
              Dejinta
            </Link>
          </p>
        ) : canComment ? (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="comment-body" className="sr-only">
              Faalladaada
            </label>
            <Textarea
              id="comment-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Ku dar faallo ama macluumaad dheeraad ah…"
              className="rounded-xl"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {canPostOfficial ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={official}
                    onChange={(e) => setOfficial(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  U dhiib jawaab rasmi ah
                </label>
              ) : (
                <span />
              )}
              <Button type="submit" className="h-10 rounded-xl px-5" disabled={pending || !body.trim()}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Dir faallada
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      {reporting ? (
        <ReportDialog
          open
          onOpenChange={(v) => !v && setReporting(null)}
          targetType="COMMENT"
          targetId={reporting}
        />
      ) : null}
    </section>
  );
}
