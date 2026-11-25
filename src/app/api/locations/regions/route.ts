import { apiRoute, json } from "@/server/http/handler";
import { listRegions } from "@/server/services/catalog.service";

export const GET = apiRoute(async () => json({ regions: await listRegions() }));
