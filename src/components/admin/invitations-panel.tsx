"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { InvitationDTO } from "@/types";

const STATE: Record<InvitationDTO["state"], { label: string; cls: string }> = {
  PENDING: { label: "Sugaya", cls: "bg-amber-50 text-amber-800" },
  ACCEPTED: { label: "La aqbalay", cls: "bg-emerald-50 text-emerald-700" },
  EXPIRED: { label: "Dhacday", cls: "bg-zinc-100 text-zinc-600" },
  REVOKED: { label: "La joojiyay", cls: "bg-red-50 text-red-700" },
};

export function InvitationsPanel({ invitations }: { invitations: InvitationDTO[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function invite(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await api("/api/admin/invitations", { method: "POST", body: { email } });
        toast.success(`Casuumad ayaa loo diray ${email}. Waxay dhacaysaa 72 saac kadib.`);
        setEmail("");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      try {
        await api(`/api/admin/invitations/${id}`, { method: "DELETE" });
        toast.success("Casuumadda waa la joojiyay.");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="rounded-lg border bg-card p-5 sm:p-6">
        <h2 className="font-bold">Casuun Tifaftire cusub</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Xiriirka casuumaddu waa hal mar isticmaal, wuxuuna dhacayaa 72 saac kadib. Maamulayaasha oo keliya ayaa casuumi kara.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="mb-2">
              Email
            </Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Button type="submit" className="h-11 rounded-xl px-5" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Dir casuumad
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card p-2 sm:p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Xaaladda</TableHead>
              <TableHead>Waxaa diray</TableHead>
              <TableHead>Wuxuu dhacayaa</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Casuumad weli lama dirin.
                </TableCell>
              </TableRow>
            ) : (
              invitations.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.email}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE[i.state].cls}`}>
                      {STATE[i.state].label}
                    </span>
                  </TableCell>
                  <TableCell>{i.invitedBy}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(i.expiresAt)}</TableCell>
                  <TableCell className="text-right">
                    {i.state === "PENDING" ? (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => revoke(i.id)}>
                        Jooji
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
