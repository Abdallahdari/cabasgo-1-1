import { apiRoute, json } from "@/server/http/handler";
import { getStatusHistory } from "@/server/services/complaint.service";

export const GET = apiRoute(async (ctx) => json({ history: await getStatusHistory(ctx.params.id, ctx.user) }));
