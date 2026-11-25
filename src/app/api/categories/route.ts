import { apiRoute, json } from "@/server/http/handler";
import { listCategories } from "@/server/services/catalog.service";

export const GET = apiRoute(async () => json({ categories: await listCategories() }));
