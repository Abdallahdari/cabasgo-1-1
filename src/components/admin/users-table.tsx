"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { AdminUserDTO } from "@/types";

export function UsersTable({ users, currentUserId }: { users: AdminUserDTO[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(id: string, body: Record<string, string>, ok: string) {
    startTransition(async () => {
      try {
        await api(`/api/admin/users/${id}`, { method: "PATCH", body });
        toast.success(ok);
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card p-2 sm:p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Magaca</TableHead>
            <TableHead>Doorka</TableHead>
            <TableHead>Xaaladda</TableHead>
            <TableHead>La diiwaangeliyay</TableHead>
            <TableHead className="text-right">Ficillo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const locked = u.role === "ADMIN" || u.id === currentUserId;
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.email}
                    {!u.emailVerified ? " · lama xaqiijin" : ""}
                  </div>
                </TableCell>
                <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                <TableCell>
                  <span className={u.status === "ACTIVE" ? "text-emerald-700" : "text-red-700"}>
                    {u.status === "ACTIVE" ? "Firfircoon" : "La hakiyay"}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {locked ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      {u.role === "EDITOR" ? (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => update(u.id, { role: "CITIZEN" }, "Doorka waa la beddelay.")}>
                          Ka qaad Tifaftire
                        </Button>
                      ) : null}
                      {u.status === "ACTIVE" ? (
                        <Button size="sm" variant="destructive" disabled={pending} onClick={() => update(u.id, { status: "SUSPENDED" }, "Akoonka waa la hakiyay.")}>
                          Hakad geli
                        </Button>
                      ) : (
                        <Button size="sm" disabled={pending} onClick={() => update(u.id, { status: "ACTIVE" }, "Akoonka waa la furay.")}>
                          Fur
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="mt-3 px-2 text-xs text-muted-foreground">
        Si qof loogu daro Tifaftire, u dir casuumad. Akoonnada maamulayaasha iyo akoonkaaga halkan lagama beddeli karo.
      </p>
    </div>
  );
}
