import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Codka Bulshada mark: a speech bubble carrying three rising bars,
 * a voice getting louder until it is heard.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground", className)}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[60%]" fill="none">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 3.7c-.5.4-1.4.1-1.4-.6V17h-.5A.5.5 0 0 1 4 16.5v-11Z"
          fill="currentColor"
        />
        <rect x="8" y="10.5" width="2" height="3.5" rx="1" fill="var(--primary)" />
        <rect x="11" y="8.5" width="2" height="5.5" rx="1" fill="var(--primary)" />
        <rect x="14" y="6.5" width="2" height="7.5" rx="1" fill="var(--primary)" />
      </svg>
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="Codka Bulshada — bogga hore">
      <BrandMark />
      <span className="text-[17px] leading-none font-extrabold tracking-[-0.02em]">
        Codka<span className="text-primary">Bulshada</span>
      </span>
    </Link>
  );
}
