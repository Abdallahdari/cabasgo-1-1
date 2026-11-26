import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getComplaint, getStatusHistory } from "@/server/services/complaint.service";
import { listComments } from "@/server/services/comment.service";
import { can } from "@/server/authz/permissions";
import { isStorageConfigured } from "@/server/storage";
import { AppError } from "@/server/http/errors";
import { getEnv } from "@/server/env";
import { AuthorLine, locationLabel } from "@/components/complaints/complaint-card";
import { StatusBadge, StatusTrail, VisibilityBadge } from "@/components/complaints/status-badge";
import { CategoryTile } from "@/components/complaints/category-icon";
import { FollowButton, LikeButton } from "@/components/complaints/engagement-buttons";
import { ComplaintMenu } from "@/components/complaints/report-dialog";
import { CommentsSection } from "@/components/complaints/comments";
import { StaffPanel } from "@/components/complaints/staff-panel";
import { OwnerPanel } from "@/components/complaints/owner-panel";
import { UserAvatar } from "@/components/user-avatar";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";

async function load(id: string) {
  const user = await getCurrentUser();
  try {
    return { user, complaint: await getComplaint(id, user) };
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps<"/complaints/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  try {
    const c = await getComplaint(id, user);
    return { title: c.title, description: c.body.slice(0, 160) };
  } catch {
    return { title: "Cabasho" };
  }
}

export default async function ComplaintPage({ params }: PageProps<"/complaints/[id]">) {
  const { id } = await params;
  const { user, complaint } = await load(id);
  const [history, comments] = await Promise.all([getStatusHistory(id, user), listComments(id, user, 1, 50)]);
  const published = complaint.visibility === "PUBLISHED";
  const staff = can(user?.role, "complaint:moderate");

  return (
    <div>
      <Link href="/" className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-2 text-sm font-semibold hover:bg-background text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Dib ugu noqo cabashooyinka
      </Link>

      {!published ? (
        <div className="mb-3 rounded-lg border border-[#f0cf9a] bg-[#fff8ec] p-3.5 text-sm text-[#5c2d05]" role="status">
          <div className="flex items-center gap-2 font-semibold">
            <VisibilityBadge visibility={complaint.visibility} />
            {complaint.visibility === "PENDING"
              ? "Cabashadan weli dadweynaha uma muuqato — waxay sugaysaa dib-u-eegis."
              : complaint.visibility === "REJECTED"
                ? "Cabashadan lama daabicin."
                : "Cabashadan waa la qariyay oo dadweynaha uma muuqato."}
          </div>
          {complaint.moderationNote ? <p className="mt-2">Qoraalka tifaftiraha: {complaint.moderationNote}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
        <div className="min-w-0 space-y-3">
          <article className="rounded-lg border bg-card px-4 pt-4 pb-3 sm:px-6 sm:pt-5" aria-labelledby="complaint-title">
            <header className="flex items-start gap-3">
              <CategoryTile icon={complaint.category.icon} color={complaint.category.color} className="size-10 rounded-full [&_svg]:size-5" />
              <div className="min-w-0 flex-1 text-[13px] leading-5">
                <div className="flex flex-wrap items-center gap-x-1.5">
                  <Link href={`/?categoryId=${complaint.category.id}`} className="font-bold hover:underline">
                    {complaint.category.name}
                  </Link>
                  <span className="text-muted-foreground" aria-hidden>·</span>
                  <time dateTime={complaint.publishedAt ?? complaint.createdAt} className="text-muted-foreground" title={formatDate(complaint.createdAt)}>
                    {timeAgo(complaint.publishedAt ?? complaint.createdAt)}
                  </time>
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                  <UserAvatar name={complaint.author?.name} anonymous={complaint.isAnonymous} size={18} />
                  <AuthorLine complaint={complaint} className="font-medium text-foreground/80 [&_svg]:size-3.5" />
                </div>
              </div>
              <ComplaintMenu complaintId={complaint.id} canReport={published && Boolean(user) && !complaint.viewer.isOwner} />
            </header>

            <h1 id="complaint-title" className="mt-4 text-2xl leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[26px]">
              {complaint.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <StatusBadge status={complaint.status} />
              <StatusTrail status={complaint.status} />
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 rounded-md bg-surface-2 px-3 py-2.5 text-[13px] sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Goobta</dt>
              <dd className="flex items-start gap-1 font-medium">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  {locationLabel(complaint)}
                  {complaint.locationDetail ? ` — ${complaint.locationDetail}` : ""}
                </span>
              </dd>
              <dt className="text-muted-foreground">Tixraac</dt>
              <dd className="font-mono font-medium tracking-wide">{complaint.referenceCode}</dd>
              <dt className="text-muted-foreground">La gudbiyay</dt>
              <dd className="tabular font-medium">{formatDate(complaint.createdAt)}</dd>
            </dl>
            <div className="mt-4 max-w-[70ch] text-[16px] leading-7 whitespace-pre-line text-foreground/90">{complaint.body}</div>

            {complaint.images.length > 0 ? (
              <div className="mt-4 grid gap-1 overflow-hidden rounded-lg border sm:grid-cols-2">
                {complaint.images.map((img, i) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Sawirka ${i + 1} ee cabashada`} className="aspect-[4/3] w-full object-cover transition-transform hover:scale-[1.02]" />
                  </a>
                ))}
              </div>
            ) : null}

            <footer className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              <LikeButton
                complaintId={complaint.id}
                initialLiked={complaint.viewer.liked}
                initialCount={complaint.likeCount}
                disabled={!published}
              />
              {published && user && !complaint.viewer.isOwner ? (
                <FollowButton complaintId={complaint.id} initialFollowing={complaint.viewer.following} variant="button" />
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="size-4" aria-hidden /> {complaint.followerCount} qof ayaa raacaya
              </span>
            </footer>
          </article>

          <CommentsSection
            complaintId={complaint.id}
            initial={comments.items}
            signedIn={Boolean(user)}
            commentsOpen={published}
            needsVerification={Boolean(user && !user.emailVerified && getEnv().REQUIRE_EMAIL_VERIFICATION)}
            canComment={Boolean(user && can(user.role, "complaint:engage"))}
            canPostOfficial={can(user?.role, "comment:official")}
            canModerate={can(user?.role, "comment:hide")}
          />
        </div>

        <div className="space-y-3">
          {staff ? (
            <StaffPanel complaintId={complaint.id} visibility={complaint.visibility} status={complaint.status} />
          ) : null}
          {complaint.viewer.isOwner ? (
            <OwnerPanel
              complaintId={complaint.id}
              visibility={complaint.visibility}
              images={complaint.images}
              uploadsEnabled={isStorageConfigured()}
            />
          ) : null}

          <section className="rounded-lg border bg-card p-4" aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="flex items-center gap-2 text-[15px] font-bold">
              <Clock className="size-[18px] text-primary" aria-hidden /> Taariikhda xaaladda
            </h2>
            <ol className="mt-4 space-y-4 border-l-2 border-border pl-5">
              <li className="relative">
                <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-card bg-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold">La gudbiyay</p>
                <p className="text-xs text-muted-foreground">{formatDate(complaint.createdAt)}</p>
              </li>
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <p className="text-sm font-semibold">{STATUS_LABELS[h.toStatus]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(h.createdAt)} · {h.changedBy}
                  </p>
                  {h.note ? <p className="mt-1 text-sm text-foreground/80">{h.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
