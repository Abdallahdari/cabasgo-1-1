import { apiRoute, json } from "@/server/http/handler";
import { objectId } from "@/lib/validation";
import { listDistricts } from "@/server/services/catalog.service";

export const GET = apiRoute(async (ctx) => json({ districts: await listDistricts(objectId.parse(ctx.params.id)) }));
