import { EyeOff } from "lucide-react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = ["#1a5db5", "#6d3fc0", "#0b7285", "#17803d", "#b45309", "#b42a6a", "#c2410c", "#3b4fc4"];

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
          "flex shrink-0 items-center justify-center rounded-full bg-[#3a4352] text-white",
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
