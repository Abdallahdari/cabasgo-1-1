import {
  Bus,
  CircleHelp,
  Construction,
  Droplets,
  GraduationCap,
  Landmark,
  Scale,
  Shield,
  Stethoscope,
  Trash2,
  Trees,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  droplets: Droplets,
  zap: Zap,
  construction: Construction,
  trash: Trash2,
  stethoscope: Stethoscope,
  "graduation-cap": GraduationCap,
  shield: Shield,
  scale: Scale,
  landmark: Landmark,
  trees: Trees,
  bus: Bus,
  "circle-help": CircleHelp,
};

/** Coloured square tile, like the community tiles in the design. */
export function CategoryTile({ icon, color, className }: { icon: string; color: string; className?: string }) {
  const Icon = ICONS[icon] ?? CircleHelp;
  return (
    <span
      className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-white", className)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <Icon className="size-5" />
    </span>
  );
}

export function CategoryGlyph({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? CircleHelp;
  return <Icon className={className} aria-hidden />;
}
