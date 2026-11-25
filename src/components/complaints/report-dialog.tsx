"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Flag, Link2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/constants";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState<ReportReason>("FALSE_INFORMATION");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await api("/api/reports", { method: "POST", body: { targetType, targetId, reason, details } });
        toast.success("Mahadsanid. Kooxda dib-u-eegista ayaa eegi doonta.");
        onOpenChange(false);
        setDetails("");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Soo sheeg {targetType === "COMPLAINT" ? "cabashadan" : "faalladan"}</DialogTitle>
            <DialogDescription>Sheeg sababta aad u aragto in waxani jebinayaan xeerarka bulshada.</DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Sababta</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-secondary">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-primary"
                />
                {REPORT_REASON_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="report-details">Faahfaahin (ikhtiyaari)</Label>
            <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Jooji
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Waa la dirayaa…" : "Dir warbixinta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ComplaintMenu({ complaintId, canReport }: { complaintId: string; canReport: boolean }) {
  const [open, setOpen] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/complaints/${complaintId}`);
      toast.success("Xiriirka waa la koobiyeeyay.");
    } catch {
      toast.error("Lama koobiyeyn karo xiriirka.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Ficillo kale"
        >
          <MoreHorizontal className="size-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={copyLink}>
            <Link2 /> Koobiyee xiriirka
          </DropdownMenuItem>
          {canReport ? (
            <DropdownMenuItem onSelect={() => setOpen(true)} variant="destructive">
              <Flag /> Soo sheeg
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog open={open} onOpenChange={setOpen} targetType="COMPLAINT" targetId={complaintId} />
    </>
  );
}
