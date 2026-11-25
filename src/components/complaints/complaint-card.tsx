import Link from "next/link";
import { BadgeCheck, MapPin, MessageCircle, Users } from "lucide-react";
import type { ComplaintDTO } from "@/types";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge, VisibilityBadge } from "@/components/complaints/status-badge";
import { CategoryGlyph } from "@/components/complaints/category-icon";
import { FollowButton, LikeButton } from "@/components/complaints/engagement-buttons";
import { ComplaintMenu } from "@/components/complaints/report-dialog";
import { compactNumber, timeAgo } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function locationLabel(c: ComplaintDTO) {
  return [c.district?.name, c.city.name, c.region.name].filter(Boolean).join(", ");
}

export function AuthorLine({ complaint }: { complaint: ComplaintDTO }) {
  const name = complaint.isAnonymous ? "Muwaadin qarsoodi" : (complaint.author?.name ?? "Muwaadin");
  const staff = complaint.author && complaint.author.role !== "CITIZEN";
  return (
    <span className="flex items-center gap-1.5 text-[17px] font-bold">
      {name}
      {staff ? (
        <BadgeCheck className="size-[18px] fill-primary text-white" aria-label={ROLE_LABELS[complaint.author!.role]} />
      ) : null}
    </span>
  );
}

function ImageGrid({ images, title }: { images: ComplaintDTO["images"]; title: string }) {
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  return (
    <div
      className={cn(
        "mt-4 grid gap-2 overflow-hidden rounded-2xl",
        shown.length === 1 ? "grid-cols-1" : "grid-cols-2",
      )}
    >
      {shown.map((img, i) => (
        // Presigned / CDN URLs vary per request, so next/image optimisation is not used here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.id}
          src={img.url}
          alt={`Sawirka ${i + 1} ee cabashada: ${title}`}
          loading="lazy"
          className={cn(
            "w-full bg-muted object-cover",
            shown.length === 1 ? "max-h-[420px]" : "aspect-[4/3]",
            shown.length === 3 && i === 0 && "row-span-2 h-full",
          )}
        />
      ))}
    </div>
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
  return (
    <article className="rounded-3xl bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-8" aria-labelledby={`c-${complaint.id}`}>
      <header className="flex items-start gap-3 sm:gap-4">
        <UserAvatar name={complaint.author?.name} anonymous={complaint.isAnonymous} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <AuthorLine complaint={complaint} />
            {published && signedIn && !complaint.viewer.isOwner ? (
              <>
                <span className="text-muted-foreground" aria-hidden>
                  •
                </span>
                <FollowButton complaintId={complaint.id} initialFollowing={complaint.viewer.following} />
              </>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <time dateTime={complaint.publishedAt ?? complaint.createdAt}>
              {timeAgo(complaint.publishedAt ?? complaint.createdAt)}
            </time>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {locationLabel(complaint)}
            </span>
          </div>
        </div>
        <ComplaintMenu complaintId={complaint.id} canReport={published && !complaint.viewer.isOwner} />
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/?categoryId=${complaint.category.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${complaint.category.color}14`, color: complaint.category.color }}
        >
          <CategoryGlyph icon={complaint.category.icon} className="size-3.5" />
          {complaint.category.name}
        </Link>
        <StatusBadge status={complaint.status} />
        {showVisibility && !published ? <VisibilityBadge visibility={complaint.visibility} /> : null}
      </div>

      <h2 id={`c-${complaint.id}`} className="mt-3 text-lg leading-snug font-bold sm:text-xl">
        <Link href={href} className="hover:text-primary">
          {complaint.title}
        </Link>
      </h2>
      <p className="mt-2 line-clamp-4 leading-7 whitespace-pre-line text-foreground/85">{complaint.body}</p>

      <ImageGrid images={complaint.images} title={complaint.title} />

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-1">
          <LikeButton
            complaintId={complaint.id}
            initialLiked={complaint.viewer.liked}
            initialCount={complaint.likeCount}
            disabled={!published}
          />
          <Link
            href={`${href}#faallooyin`}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Faallooyin</span>
            <span className="tabular-nums">{compactNumber(complaint.commentCount)}</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" title="Dadka raacaya">
            <Users className="size-3.5" aria-hidden />
            {compactNumber(complaint.followerCount)}
          </span>
          <span className="font-mono">{complaint.referenceCode}</span>
        </div>
      </footer>
    </article>
  );
}
