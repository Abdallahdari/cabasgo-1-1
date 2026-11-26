"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";

const QUICK_REASONS = [
  "Sawir ama qoraal aan habboonayn (anshax xumo / galmo)",
  "Af-lagaado ama nacayb",
  "Macluumaad been ah ama aan la xaqiijin karin",
  "Xog gaar ah oo qof kale",
];

/** Inline approve / reject controls shown under each card in the review queue. */
export function ModerationActions({ complaintId, imageCount }: { complaintId: string; imageCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function moderate(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && reason.trim().length < 5) {
      toast.error("Fadlan dooro ama qor sababta diidmada.");
      return;
    }
    startTransition(async () => {
      try {
        await api(`/api/complaints/${complaintId}/moderate`, {
          method: "POST",
          body: { action, note: action === "REJECT" ? reason : "" },
        });
        toast.success(action === "APPROVE" ? "Waa la ansixiyay oo la daabacay." : "Waa la diiday. Warbixiyaha waa la ogeysiiyay.");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <div className="-mt-1.5 rounded-lg border border-[#f0cf9a] bg-[#fff8ec] px-4 py-3 sm:px-5">
      {imageCount > 0 ? (
        <p className="mb-3 text-sm font-medium text-amber-900">
          Hubi {imageCount} sawir ka hor intaadan ansixin — waxyaabo anshax xumo ama galmo ah lama daabici karo.
        </p>
      ) : null}
      {!rejecting ? (
        <div className="flex flex-wrap gap-2">
          <Button className="h-10 rounded-xl px-5" disabled={pending} onClick={() => moderate("APPROVE")}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Ansixi oo daabac
          </Button>
          <Button variant="destructive" className="h-10 rounded-xl px-5" disabled={pending} onClick={() => setRejecting(true)}>
            <X aria-hidden /> Diid
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Sababta diidmada (waxaa loo dirayaa warbixiyaha):</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${reason === r ? "border-destructive bg-red-50 text-red-700" : "bg-card hover:bg-muted"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Ama qor sabab kale…"
            aria-label="Sababta diidmada"
            className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button variant="destructive" className="h-10 rounded-xl px-5" disabled={pending} onClick={() => moderate("REJECT")}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Xaqiiji diidmada
            </Button>
            <Button variant="outline" className="h-10 rounded-xl" disabled={pending} onClick={() => setRejecting(false)}>
              Jooji
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
