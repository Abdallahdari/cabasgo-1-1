import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 rounded-[28px] bg-canvas p-3 sm:p-6 lg:p-8" aria-busy="true" aria-label="Waa la soo rarayaa">
      <Skeleton className="h-64 rounded-3xl bg-card" />
      <Skeleton className="h-40 rounded-3xl bg-card" />
      <Skeleton className="h-72 rounded-3xl bg-card" />
    </div>
  );
}
