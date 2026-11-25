import { apiRoute, json } from "@/server/http/handler";
import { objectId } from "@/lib/validation";
import { listCities } from "@/server/services/catalog.service";

export const GET = apiRoute(async (ctx) => json({ cities: await listCities(objectId.parse(ctx.params.id)) }));
