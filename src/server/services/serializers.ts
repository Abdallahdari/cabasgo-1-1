import "server-only";
import { Types } from "mongoose";
import {
  CategoryModel,
  CityModel,
  ComplaintFollowerModel,
  ComplaintImageModel,
  ComplaintLikeModel,
  DistrictModel,
  RegionModel,
  UserModel,
  type ComplaintDoc,
} from "@/server/db/models";
import { imageUrl } from "@/server/storage";
import { isStaff } from "@/server/authz/permissions";
import type { SessionUser } from "@/server/auth/session";
import type { ComplaintDTO, ImageDTO } from "@/types";
import type { ComplaintStatus, Role, Visibility } from "@/lib/constants";
import { logger } from "@/server/logger";

export type ComplaintLean = ComplaintDoc & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

const idStr = (v: unknown) => (v ? String(v) : "");

/**
 * The ONLY way complaints leave the server. It whitelists fields and, for
 * anonymous complaints, never includes the author's name, id or email.
 * Private fields (email, authorId) are never included for anyone.
 */
export async function serializeComplaints(docs: ComplaintLean[], viewer: SessionUser | null): Promise<ComplaintDTO[]> {
  if (docs.length === 0) return [];
  const ids = docs.map((d) => d._id);
  const uniq = (vals: unknown[]) => [...new Set(vals.filter(Boolean).map(String))];

  const [categories, regions, cities, districts, authors, images, likes, follows] = await Promise.all([
    CategoryModel.find({ _id: { $in: uniq(docs.map((d) => d.categoryId)) } }).select("name slug color icon").lean(),
    RegionModel.find({ _id: { $in: uniq(docs.map((d) => d.regionId)) } }).select("name slug").lean(),
    CityModel.find({ _id: { $in: uniq(docs.map((d) => d.cityId)) } }).select("name slug").lean(),
    DistrictModel.find({ _id: { $in: uniq(docs.map((d) => d.districtId)) } }).select("name slug").lean(),
    // Only non-anonymous authors are looked up, and only name + role.
    UserModel.find({ _id: { $in: uniq(docs.filter((d) => !d.isAnonymous).map((d) => d.authorId)) } })
      .select("name role")
      .lean(),
    ComplaintImageModel.find({ complaintId: { $in: ids }, status: "ATTACHED" }).sort({ order: 1, createdAt: 1 }).lean(),
    viewer
      ? ComplaintLikeModel.find({ complaintId: { $in: ids }, userId: viewer.id }).select("complaintId").lean()
      : Promise.resolve([]),
    viewer
      ? ComplaintFollowerModel.find({ complaintId: { $in: ids }, userId: viewer.id }).select("complaintId").lean()
      : Promise.resolve([]),
  ]);

  const byId = <T extends { _id: unknown }>(rows: T[]) => new Map(rows.map((r) => [String(r._id), r]));
  const catMap = byId(categories);
  const regMap = byId(regions);
  const cityMap = byId(cities);
  const distMap = byId(districts);
  const authorMap = byId(authors);
  const liked = new Set(likes.map((l) => String(l.complaintId)));
  const followed = new Set(follows.map((f) => String(f.complaintId)));

  const imagesByComplaint = new Map<string, ImageDTO[]>();
  const visibilityById = new Map(docs.map((d) => [String(d._id), d.visibility]));
  await Promise.all(
    images.map(async (img) => {
      const cid = String(img.complaintId);
      let url = "";
      try {
        url = await imageUrl(img.key, visibilityById.get(cid) === "PUBLISHED");
      } catch (err) {
        logger.warn("image.url_failed", { error: (err as Error).message });
        return;
      }
      const list = imagesByComplaint.get(cid) ?? [];
      list.push({ id: String(img._id), url, contentType: img.contentType });
      imagesByComplaint.set(cid, list);
    }),
  );

  return docs.map((d) => {
    const id = String(d._id);
    const isOwner = Boolean(viewer && idStr(d.authorId) === viewer.id);
    const canSeeModeration = isOwner || isStaff(viewer?.role);
    const cat = catMap.get(idStr(d.categoryId));
    const reg = regMap.get(idStr(d.regionId));
    const city = cityMap.get(idStr(d.cityId));
    const dist = d.districtId ? distMap.get(idStr(d.districtId)) : undefined;
    const author = !d.isAnonymous ? authorMap.get(idStr(d.authorId)) : undefined;

    const dto: ComplaintDTO = {
      id,
      referenceCode: d.referenceCode,
      title: d.title,
      body: d.body,
      category: {
        id: idStr(d.categoryId),
        name: cat?.name ?? "—",
        slug: cat?.slug,
        color: cat?.color ?? "#2F6FED",
        icon: cat?.icon ?? "circle-help",
      },
      region: { id: idStr(d.regionId), name: reg?.name ?? "—", slug: reg?.slug },
      city: { id: idStr(d.cityId), name: city?.name ?? "—", slug: city?.slug },
      district: dist ? { id: String(dist._id), name: dist.name, slug: dist.slug } : null,
      locationDetail: d.locationDetail ?? "",
      isAnonymous: d.isAnonymous,
      author: d.isAnonymous ? null : author ? { name: author.name, role: author.role as Role } : null,
      status: d.status as ComplaintStatus,
      visibility: d.visibility as Visibility,
      likeCount: d.likeCount ?? 0,
      commentCount: d.commentCount ?? 0,
      followerCount: d.followerCount ?? 0,
      images: imagesByComplaint.get(id) ?? [],
      createdAt: d.createdAt.toISOString(),
      publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
      viewer: { liked: liked.has(id), following: followed.has(id), isOwner },
    };
    if (canSeeModeration && d.moderationNote) dto.moderationNote = d.moderationNote;
    return dto;
  });
}

export async function serializeComplaint(doc: ComplaintLean, viewer: SessionUser | null) {
  return (await serializeComplaints([doc], viewer))[0];
}
