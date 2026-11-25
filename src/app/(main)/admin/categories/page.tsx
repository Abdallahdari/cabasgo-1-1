import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/current-user";
import { listCategories } from "@/server/services/catalog.service";
import { CategoriesPanel } from "@/components/admin/categories-panel";

export const metadata: Metadata = { title: "Qaybaha" };

export default async function CategoriesPage() {
  await requirePagePermission("category:manage", "/admin/categories");
  const categories = await listCategories(true);
  return <CategoriesPanel categories={categories} />;
}
