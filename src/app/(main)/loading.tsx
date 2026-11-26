import { Skeleton } from "@/components/ui/skeleton";

function PostSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-lg border bg-card">
      <div className="hidden w-14 bg-surface-2 sm:block" />
      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Waa la soo rarayaa">
      <Skeleton className="h-[104px] rounded-lg border bg-card" />
      <Skeleton className="h-12 rounded-lg border bg-card" />
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}
