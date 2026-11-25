import Link from "next/link";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30",
        className,
      )}
    >
      <Megaphone className="size-5" aria-hidden />
    </span>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Codka Bulshada — bogga hore">
      <BrandMark />
      <span className="text-[17px] font-extrabold tracking-tight uppercase">Codka Bulshada</span>
    </Link>
  );
}
