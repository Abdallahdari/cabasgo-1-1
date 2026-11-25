"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api-client";
import { STATUS_LABELS, STATUS_TRANSITIONS, type ComplaintStatus, type Visibility } from "@/lib/constants";

type Action = "APPROVE" | "REJECT" | "HIDE" | "RESTORE";

const ACTIONS: Record<Visibility, { action: Action; label: string; variant: "default" | "destructive" | "outline"; needsNote: boolean }[]> = {
  PENDING: [
    { action: "APPROVE", label: "Ansixi oo daabac", variant: "default", needsNote: false },
    { action: "REJECT", label: "Diid", variant: "destructive", needsNote: true },
  ],
  REJECTED: [{ action: "APPROVE", label: "Ansixi oo daabac", variant: "default", needsNote: false }],
  PUBLISHED: [{ action: "HIDE", label: "Qari cabashada", variant: "destructive", needsNote: true }],
  HIDDEN: [{ action: "RESTORE", label: "Soo celi", variant: "outline", needsNote: false }],
};

/** Moderation + status workflow controls for editors and admins. */
export function StaffPanel({
  complaintId,
  visibility,
  status,
}: {
  complaintId: string;
  visibility: Visibility;
  status: ComplaintStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modNote, setModNote] = useState("");
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | "">("");
  const [statusNote, setStatusNote] = useState("");

  function moderate(action: Action, needsNote: boolean) {
    if (needsNote && modNote.trim().length < 5) {
      toast.error("Fadlan qor sababta (ugu yaraan 5 xaraf).");
      return;
    }
    startTransition(async () => {
      try {
        await api(`/api/complaints/${complaintId}/moderate`, { method: "POST", body: { action, note: modNote } });
        toast.success("Waa la keydiyay.");
        setModNote("");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  function changeStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!nextStatus) return;
    startTransition(async () => {
      try {
        await api(`/api/complaints/${complaintId}/status`, {
          method: "POST",
          body: { status: nextStatus, note: statusNote },
        });
        toast.success(`Xaaladda waxaa loo beddelay: ${STATUS_LABELS[nextStatus]}`);
        setNextStatus("");
        setStatusNote("");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <section className="rounded-3xl border-2 border-primary/15 bg-card p-5 sm:p-6" aria-labelledby="staff-title">
      <h2 id="staff-title" className="flex items-center gap-2 font-bold">
        <ShieldCheck className="size-5 text-primary" aria-hidden /> Ficillada shaqaalaha
      </h2>

      <div className="mt-4 space-y-3">
        <Label htmlFor="mod-note" className="text-xs text-muted-foreground">
          Qoraal dib-u-eegis (waa loo dirayaa warbixiyaha)
        </Label>
        <Textarea id="mod-note" value={modNote} onChange={(e) => setModNote(e.target.value)} rows={2} maxLength={500} />
        <div className="flex flex-wrap gap-2">
          {ACTIONS[visibility].map((a) => (
            <Button
              key={a.action}
              variant={a.variant}
              className="h-10 rounded-xl px-4"
              disabled={pending}
              onClick={() => moderate(a.action, a.needsNote)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      {visibility === "PUBLISHED" ? (
        <form onSubmit={changeStatus} className="mt-6 space-y-3 border-t pt-5">
          <Label htmlFor="next-status" className="text-xs text-muted-foreground">
            Beddel xaaladda (hadda: {STATUS_LABELS[status]})
          </Label>
          <select
            id="next-status"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
          >
            <option value="">Dooro xaalad cusub…</option>
            {STATUS_TRANSITIONS[status].map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Textarea
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Qoraal dadweyne oo ku saabsan isbeddelka (ikhtiyaari)"
            aria-label="Qoraalka isbeddelka xaaladda"
          />
          <Button type="submit" className="h-10 w-full rounded-xl" disabled={pending || !nextStatus}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Cusbooneysii xaaladda
          </Button>
        </form>
      ) : null}
    </section>
  );
}
