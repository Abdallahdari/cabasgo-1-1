import { STATUS_LABELS, VISIBILITY_LABELS, type ComplaintStatus, type Visibility } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  OPEN: "bg-slate-100 text-slate-700",
  ACKNOWLEDGED: "bg-sky-50 text-sky-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-zinc-100 text-zinc-600",
};

const DOT: Record<ComplaintStatus, string> = {
  OPEN: "bg-slate-400",
  ACKNOWLEDGED: "bg-sky-500",
  IN_PROGRESS: "bg-amber-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-zinc-400",
};

export function StatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

const VIS_STYLES: Record<Visibility, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-200",
  HIDDEN: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
};

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", VIS_STYLES[visibility])}>
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}
