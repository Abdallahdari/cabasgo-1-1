import { EyeOff } from "lucide-react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = ["#2f6fed", "#7c3aed", "#0ea5e9", "#16a34a", "#d97706", "#db2777", "#0891b2", "#4f46e5"];

function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Initials avatar. Pass `anonymous` for anonymous reporters (no identity). */
export function UserAvatar({
  name,
  anonymous,
  size = 44,
  className,
}: {
  name?: string | null;
  anonymous?: boolean;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (anonymous || !name) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white",
          className,
        )}
        style={style}
        aria-label="Muwaadin qarsoodi"
      >
        <EyeOff style={{ width: size * 0.42, height: size * 0.42 }} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
      style={{ ...style, backgroundColor: colorFor(name) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
