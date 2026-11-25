import { apiRoute, json } from "@/server/http/handler";
import { toCurrentUserDTO } from "@/server/services/user.service";

export const GET = apiRoute(async ({ user }) => json({ user: user ? toCurrentUserDTO(user) : null }));
