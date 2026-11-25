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
import { StatusBadge, VisibilityBadge } from "@/components/complaints/status-badge";
import { CategoryGlyph } from "@/components/complaints/category-icon";
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
    <div className="rounded-[28px] bg-canvas p-3 sm:p-6 lg:p-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Dib ugu noqo cabashooyinka
      </Link>

      {!published ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <article className="rounded-3xl bg-card p-5 sm:p-8" aria-labelledby="complaint-title">
            <header className="flex items-start gap-4">
              <UserAvatar name={complaint.author?.name} anonymous={complaint.isAnonymous} size={52} />
              <div className="min-w-0 flex-1">
                <AuthorLine complaint={complaint} />
                <p className="mt-1 text-sm text-muted-foreground">
                  {timeAgo(complaint.publishedAt ?? complaint.createdAt)} · {formatDate(complaint.createdAt)}
                </p>
              </div>
              <ComplaintMenu complaintId={complaint.id} canReport={published && Boolean(user) && !complaint.viewer.isOwner} />
            </header>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: `${complaint.category.color}14`, color: complaint.category.color }}
              >
                <CategoryGlyph icon={complaint.category.icon} className="size-3.5" />
                {complaint.category.name}
              </span>
              <StatusBadge status={complaint.status} />
              <span className="font-mono text-xs text-muted-foreground">{complaint.referenceCode}</span>
            </div>

            <h1 id="complaint-title" className="mt-4 text-2xl leading-tight font-bold tracking-tight sm:text-[28px]">
              {complaint.title}
            </h1>
            <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {locationLabel(complaint)}
                {complaint.locationDetail ? ` — ${complaint.locationDetail}` : ""}
              </span>
            </p>
            <div className="mt-5 leading-8 whitespace-pre-line text-foreground/90">{complaint.body}</div>

            {complaint.images.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {complaint.images.map((img, i) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Sawirka ${i + 1} ee cabashada`} className="aspect-[4/3] w-full object-cover transition-transform hover:scale-[1.02]" />
                  </a>
                ))}
              </div>
            ) : null}

            <footer className="mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
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

        <div className="space-y-6">
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

          <section className="rounded-3xl bg-card p-5 sm:p-6" aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="flex items-center gap-2 font-bold">
              <Clock className="size-5 text-primary" aria-hidden /> Taariikhda xaaladda
            </h2>
            <ol className="mt-5 space-y-5 border-l-2 border-border pl-5">
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
