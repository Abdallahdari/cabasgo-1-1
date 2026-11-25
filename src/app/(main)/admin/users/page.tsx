import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/current-user";
import { listUsers } from "@/server/services/user.service";
import { UsersTable } from "@/components/admin/users-table";
import { Pagination } from "@/components/pagination";
import { paginationQuery } from "@/lib/validation";
import { ROLES, type Role } from "@/lib/constants";

export const metadata: Metadata = { title: "Isticmaalayaasha" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const user = await requirePagePermission("user:manage", "/admin/users");
  const sp = await searchParams;
  const { page } = paginationQuery.parse({ page: typeof sp.page === "string" ? sp.page : undefined });
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const role = (ROLES as readonly string[]).includes(String(sp.role)) ? (sp.role as Role) : undefined;
  const data = await listUsers(user, { page, pageSize: 20, q, role });

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2" role="search">
        <label htmlFor="user-q" className="sr-only">Raadi</label>
        <input id="user-q" name="q" defaultValue={q} placeholder="Raadi magac ama email…" className="h-10 flex-1 rounded-xl border bg-card px-3 text-sm" />
        <select name="role" defaultValue={role ?? ""} className="h-10 rounded-xl border bg-card px-3 text-sm" aria-label="Doorka">
          <option value="">Dhammaan doorarka</option>
          <option value="CITIZEN">Muwaadin</option>
          <option value="EDITOR">Tifaftire</option>
          <option value="ADMIN">Maamule</option>
        </select>
        <button className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Raadi</button>
      </form>
      <UsersTable users={data.items} currentUserId={user.id} />
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/users" params={{ q, role }} />
    </div>
  );
}
