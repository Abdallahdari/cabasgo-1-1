import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { CategoryModel, CityModel, ComplaintModel, DistrictModel, RegionModel } from "@/server/db/models";
import { can } from "@/server/authz/permissions";
import type { SessionUser } from "@/server/auth/session";
import { Errors } from "@/server/http/errors";
import { audit } from "@/server/services/audit.service";
import type { CategoryIcon } from "@/lib/constants";

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  active: boolean;
};

export async function listCategories(includeInactive = false): Promise<CategoryItem[]> {
  await connectDB();
  const rows = await CategoryModel.find(includeInactive ? {} : { active: true }).sort({ order: 1, name: 1 }).lean();
  return rows.map((c) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    icon: c.icon ?? "circle-help",
    color: c.color ?? "#2F6FED",
    order: c.order ?? 0,
    active: c.active ?? true,
  }));
}

export async function listRegions() {
  await connectDB();
  const rows = await RegionModel.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  return rows.map((r) => ({ id: String(r._id), name: r.name, slug: r.slug }));
}

export async function listCities(regionId: string) {
  await connectDB();
  const rows = await CityModel.find({ regionId: new Types.ObjectId(regionId), active: true }).sort({ name: 1 }).lean();
  return rows.map((r) => ({ id: String(r._id), name: r.name, slug: r.slug }));
}

export async function listDistricts(cityId: string) {
  await connectDB();
  const rows = await DistrictModel.find({ cityId: new Types.ObjectId(cityId), active: true }).sort({ name: 1 }).lean();
  return rows.map((r) => ({ id: String(r._id), name: r.name, slug: r.slug }));
}

/** Published complaint counts grouped by a field (category or region). */
export async function countPublishedBy(field: "categoryId" | "regionId", limit = 8) {
  await connectDB();
  const rows = await ComplaintModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { visibility: "PUBLISHED" } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  icon?: CategoryIcon;
  color?: string;
  order?: number;
  active?: boolean;
};

export async function createCategory(input: CategoryInput, actor: SessionUser & { ip?: string }) {
  if (!can(actor.role, "category:manage")) throw Errors.forbidden();
  await connectDB();
  const doc = await CategoryModel.create(input);
  await audit(actor, "category.create", { type: "Category", id: String(doc._id) }, { slug: input.slug });
  return String(doc._id);
}

export async function updateCategory(id: string, input: Partial<CategoryInput>, actor: SessionUser & { ip?: string }) {
  if (!can(actor.role, "category:manage")) throw Errors.forbidden();
  if (!Types.ObjectId.isValid(id)) throw Errors.notFound();
  await connectDB();
  const res = await CategoryModel.updateOne({ _id: id }, { $set: input }, { runValidators: true });
  if (res.matchedCount === 0) throw Errors.notFound("Qaybta lama helin.");
  await audit(actor, "category.update", { type: "Category", id }, { changes: Object.keys(input) });
}
