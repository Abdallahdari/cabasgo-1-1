"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import { REPORT_REASON_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { ReportDTO } from "@/types";

export function ReportsTable({ reports }: { reports: ReportDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  function resolve(id: string, status: "RESOLVED" | "DISMISSED", hideContent: boolean) {
    startTransition(async () => {
      try {
        await api(`/api/admin/reports/${id}`, {
          method: "PATCH",
          body: { status, hideContent, note: notes[id] ?? "" },
        });
        toast.success(status === "DISMISSED" ? "Warbixinta waa la iska dhaafay." : "Warbixinta waa la xaliyay.");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  if (reports.length === 0) {
    return <p className="rounded-3xl bg-card p-10 text-center text-muted-foreground">Warbixin ma jirto.</p>;
  }

  return (
    <ul className="space-y-4">
      {reports.map((r) => (
        <li key={r.id} className="rounded-3xl bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
              {REPORT_REASON_LABELS[r.reason]}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {r.targetType === "COMPLAINT" ? "Cabasho" : "Faallo"}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
          </div>
          <Link href={`/complaints/${r.complaintId}`} className="mt-3 block font-semibold hover:text-primary">
            {r.complaintTitle}
          </Link>
          {r.targetExcerpt ? (
            <blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">{r.targetExcerpt}</blockquote>
          ) : null}
          {r.details ? <p className="mt-2 text-sm">Faahfaahinta warbixiyaha: {r.details}</p> : null}
          {r.status === "OPEN" ? (
            <div className="mt-4 space-y-3">
              <input
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                maxLength={500}
                placeholder="Qoraal go'aanka (ikhtiyaari)"
                aria-label="Qoraal go'aanka"
                className="h-10 w-full rounded-xl border px-3 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" className="rounded-xl" disabled={pending} onClick={() => resolve(r.id, "RESOLVED", true)}>
                  Qari {r.targetType === "COMPLAINT" ? "cabashada" : "faallada"}
                </Button>
                <Button className="rounded-xl" disabled={pending} onClick={() => resolve(r.id, "RESOLVED", false)}>
                  Xalli (ha qarin)
                </Button>
                <Button variant="outline" className="rounded-xl" disabled={pending} onClick={() => resolve(r.id, "DISMISSED", false)}>
                  Iska dhaaf
                </Button>
              </div>
            </div>
          ) : r.resolutionNote ? (
            <p className="mt-3 text-sm text-muted-foreground">Go&apos;aan: {r.resolutionNote}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
