import { apiRoute, json, parseQuery, requireUser } from "@/server/http/handler";
import { paginationQuery } from "@/lib/validation";
import { listNotifications, unreadNotificationCount } from "@/server/services/notification.service";

export const GET = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  const { page, pageSize } = parseQuery(ctx.req, paginationQuery);
  const [list, unread] = await Promise.all([listNotifications(user.id, page, pageSize), unreadNotificationCount(user.id)]);
  return json({ ...list, unread });
});
