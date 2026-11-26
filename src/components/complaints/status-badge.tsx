import { CircleCheck, CircleDot, CircleSlash, Eye, Hammer } from "lucide-react";
import { STATUS_LABELS, VISIBILITY_LABELS, type ComplaintStatus, type Visibility } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  OPEN: "bg-[#eef1f5] text-[#3d4655]",
  ACKNOWLEDGED: "bg-[#e5f0fb] text-[#145196]",
  IN_PROGRESS: "bg-[#fdf0dc] text-[#8a4507]",
  RESOLVED: "bg-[#e3f4e8] text-[#13652f]",
  CLOSED: "bg-[#ebebed] text-[#52525b]",
};

const STATUS_ICON = {
  OPEN: CircleDot,
  ACKNOWLEDGED: Eye,
  IN_PROGRESS: Hammer,
  RESOLVED: CircleCheck,
  CLOSED: CircleSlash,
} as const;

export function StatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full pr-2.5 pl-2 text-xs font-semibold whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** The four public steps a complaint walks through, in order. */
const TRAIL: ComplaintStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

const TRAIL_FILL: Record<ComplaintStatus, string> = {
  OPEN: "bg-[#6b7585]",
  ACKNOWLEDGED: "bg-[#2b74c9]",
  IN_PROGRESS: "bg-[#d97a0b]",
  RESOLVED: "bg-[#1f9a4a]",
  CLOSED: "bg-[#8b8b94]",
};

/**
 * The record's progress: four segments from "Furan" to "La xaliyay".
 * Reached steps fill in the current status colour; closed complaints show
 * a struck, neutral trail so state never depends on colour alone.
 */
export function StatusTrail({ status, className, showLabel = true }: { status: ComplaintStatus; className?: string; showLabel?: boolean }) {
  const closed = status === "CLOSED";
  const reached = closed ? TRAIL.length : TRAIL.indexOf(status) + 1;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="flex w-28 shrink-0 gap-[3px] sm:w-36"
        role="img"
        aria-label={closed ? STATUS_LABELS.CLOSED : `Tallaabada ${reached} ee ${TRAIL.length}: ${STATUS_LABELS[status]}`}
      >
        {TRAIL.map((step, i) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              closed ? "bg-[repeating-linear-gradient(135deg,#a1a1aa_0_3px,#e4e4e7_3px_6px)]" : i < reached ? TRAIL_FILL[status] : "bg-[#dfe3e9]",
            )}
          />
        ))}
      </div>
      {showLabel ? (
        <span className="tabular text-xs font-medium whitespace-nowrap text-muted-foreground">
          {closed ? STATUS_LABELS.CLOSED : `${reached}/${TRAIL.length} · ${STATUS_LABELS[status]}`}
        </span>
      ) : null}
    </div>
  );
}

const VIS_STYLES: Record<Visibility, string> = {
  PENDING: "bg-[#fdf0dc] text-[#8a4507] ring-1 ring-[#f3d4a4]",
  PUBLISHED: "bg-[#e3f4e8] text-[#13652f]",
  REJECTED: "bg-[#fde8e8] text-[#a52020] ring-1 ring-[#f5c2c2]",
  HIDDEN: "bg-[#ebebed] text-[#3f3f46] ring-1 ring-[#d4d4d8]",
};

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", VIS_STYLES[visibility])}>
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}
