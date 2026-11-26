import Link from "next/link";
import { BadgeCheck, MapPin, MessageSquare, Users } from "lucide-react";
import type { ComplaintDTO } from "@/types";
import { StatusBadge, StatusTrail, VisibilityBadge } from "@/components/complaints/status-badge";
import { CategoryTile } from "@/components/complaints/category-icon";
import { FollowButton, LikeButton } from "@/components/complaints/engagement-buttons";
import { ComplaintMenu } from "@/components/complaints/report-dialog";
import { compactNumber, timeAgo } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function locationLabel(c: ComplaintDTO) {
  return [c.district?.name, c.city.name, c.region.name].filter(Boolean).join(", ");
}

export function AuthorLine({ complaint, className }: { complaint: ComplaintDTO; className?: string }) {
  const name = complaint.isAnonymous ? "Muwaadin qarsoodi" : (complaint.author?.name ?? "Muwaadin");
  const staff = complaint.author && complaint.author.role !== "CITIZEN";
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold", className)}>
      {name}
      {staff ? (
        <BadgeCheck className="size-4 fill-primary text-white" aria-label={ROLE_LABELS[complaint.author!.role]} />
      ) : null}
    </span>
  );
}

function ImageGrid({ images, title, href }: { images: ComplaintDTO["images"]; title: string; href: string }) {
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  return (
    <Link
      href={href}
      className={cn("mt-3 grid gap-0.5 overflow-hidden rounded-lg border bg-muted", shown.length === 1 ? "grid-cols-1" : "grid-cols-2")}
      tabIndex={-1}
      aria-hidden
    >
      {shown.map((img, i) => (
        <span key={img.id} className={cn("relative block", shown.length === 3 && i === 0 && "row-span-2")}>
          {/* Presigned / CDN URLs vary per request, so next/image optimisation is not used here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={`Sawirka ${i + 1} ee cabashada: ${title}`}
            loading="lazy"
            className={cn(
              "w-full object-cover",
              shown.length === 1 ? "max-h-[460px]" : "aspect-[4/3]",
              shown.length === 3 && i === 0 && "h-full",
            )}
          />
          {extra > 0 && i === shown.length - 1 ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white">+{extra}</span>
          ) : null}
        </span>
      ))}
    </Link>
  );
}

export function ComplaintCard({
  complaint,
  signedIn,
  showVisibility,
}: {
  complaint: ComplaintDTO;
  signedIn: boolean;
  showVisibility?: boolean;
}) {
  const href = `/complaints/${complaint.id}`;
  const published = complaint.visibility === "PUBLISHED";
  const when = complaint.publishedAt ?? complaint.createdAt;

  return (
    <article
      className="group/card flex overflow-hidden rounded-lg border bg-card transition-colors hover:border-[#b9c2ce]"
      aria-labelledby={`c-${complaint.id}`}
    >
      {/* Support rail (desktop) */}
      <div className="hidden w-14 shrink-0 flex-col items-center bg-surface-2 px-1.5 pt-2.5 sm:flex">
        <LikeButton
          variant="rail"
          complaintId={complaint.id}
          initialLiked={complaint.viewer.liked}
          initialCount={complaint.likeCount}
          disabled={!published}
        />
      </div>

      <div className="min-w-0 flex-1 px-4 pt-3 pb-2 sm:pl-4 sm:pr-5">
        <header className="flex items-start gap-2.5">
          <Link href={`/?categoryId=${complaint.category.id}`} className="mt-0.5 shrink-0" aria-hidden tabIndex={-1}>
            <CategoryTile icon={complaint.category.icon} color={complaint.category.color} className="size-8 rounded-full [&_svg]:size-4" />
          </Link>
          <div className="min-w-0 flex-1 text-[13px] leading-5">
            <div className="flex flex-wrap items-center gap-x-1.5">
              <Link href={`/?categoryId=${complaint.category.id}`} className="font-bold text-foreground hover:underline">
                {complaint.category.name}
              </Link>
              <span className="text-muted-foreground" aria-hidden>·</span>
              <time dateTime={when} className="text-muted-foreground">
                {timeAgo(when)}
              </time>
              {published && signedIn && !complaint.viewer.isOwner ? (
                <span className="ml-1">
                  <FollowButton complaintId={complaint.id} initialFollowing={complaint.viewer.following} />
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
              <AuthorLine complaint={complaint} className="font-medium text-foreground/80 [&_svg]:size-3.5" />
              <span aria-hidden>·</span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{locationLabel(complaint)}</span>
              </span>
            </div>
          </div>
          <ComplaintMenu complaintId={complaint.id} canReport={published && !complaint.viewer.isOwner} />
        </header>

        <h2 id={`c-${complaint.id}`} className="mt-2.5 text-lg leading-snug font-bold tracking-[-0.01em] text-balance">
          <Link href={href} className="hover:text-primary">
            {complaint.title}
          </Link>
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge status={complaint.status} />
          <StatusTrail status={complaint.status} showLabel={false} />
          {showVisibility && !published ? <VisibilityBadge visibility={complaint.visibility} /> : null}
        </div>

        <p className="mt-2.5 line-clamp-3 text-[15px] leading-6 whitespace-pre-line text-foreground/85">{complaint.body}</p>

        <ImageGrid images={complaint.images} title={complaint.title} href={href} />

        <footer className="mt-2 flex flex-wrap items-center gap-1 text-[13px]">
          <span className="sm:hidden">
            <LikeButton
              complaintId={complaint.id}
              initialLiked={complaint.viewer.liked}
              initialCount={complaint.likeCount}
              disabled={!published}
            />
          </span>
          <Link
            href={`${href}#faallooyin`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-semibold text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquare className="size-[18px]" aria-hidden />
            <span className="tabular">{compactNumber(complaint.commentCount)}</span>
            <span className="hidden sm:inline">Faallooyin</span>
          </Link>
          <span className="inline-flex h-9 items-center gap-1.5 px-3 font-semibold text-foreground/75" title="Dadka raacaya">
            <Users className="size-[18px]" aria-hidden />
            <span className="tabular">{compactNumber(complaint.followerCount)}</span>
            <span className="hidden sm:inline">raacaya</span>
          </span>
          <span className="ml-auto font-mono text-xs tracking-wide text-muted-foreground" title="Lambarka tixraaca">
            {complaint.referenceCode}
          </span>
        </footer>
      </div>
    </article>
  );
}
