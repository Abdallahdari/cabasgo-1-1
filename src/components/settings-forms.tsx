"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/api-client";
import { ROLE_LABELS, type Role } from "@/lib/constants";

const card = "rounded-3xl bg-card p-5 sm:p-8";

export function SettingsForms({
  profile,
  regions,
}: {
  profile: { name: string; email: string; role: Role; regionId: string | null; notifyByEmail: boolean; emailVerified: boolean };
  regions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name);
  const [regionId, setRegionId] = useState(profile.regionId ?? "");
  const [notifyByEmail, setNotifyByEmail] = useState(profile.notifyByEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });

  return (
    <div className="space-y-6">
      <section className={card} aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-lg font-bold">
          Xogtaada
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Doorka akoonkaaga: <strong>{ROLE_LABELS[profile.role]}</strong>. Doorarka waxaa beddeli kara maamulayaasha oo keliya.
        </p>
        <form
          className="mt-6 grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api("/api/me/profile", {
                method: "PATCH",
                body: { name, regionId: regionId || null, notifyByEmail },
              });
              toast.success("Xogta waa la keydiyay.");
              router.refresh();
            });
          }}
        >
          <div>
            <Label htmlFor="name" className="mb-2">
              Magaca
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-11 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input id="email" value={profile.email} disabled className="h-11 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="region" className="mb-2">
              Gobolkaaga
            </Label>
            <select
              id="region"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">—</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={notifyByEmail}
              onChange={(e) => setNotifyByEmail(e.target.checked)}
              className="size-4 accent-primary"
            />
            Ii soo dir email marka cabashadayda xaaladdeedu isbeddesho
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" className="h-11 rounded-xl px-6" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Keydi
            </Button>
          </div>
        </form>
      </section>

      <section id="email" className={`${card} scroll-mt-28`} aria-labelledby="email-title">
        <h2 id="email-title" className="text-lg font-bold">
          Xaqiijinta email-ka
        </h2>
        {profile.emailVerified ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-5" aria-hidden /> Email-kaaga waa la xaqiijiyay.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <MailWarning className="size-5" aria-hidden /> Email-kaaga weli lama xaqiijin (ikhtiyaari). Xaqiijintu waxay kaa caawinaysaa soo celinta akoonka.
            </p>
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await api("/api/auth/resend-verification", { method: "POST" });
                  toast.success(`Xiriir xaqiijin ayaa loo diray ${profile.email}.`);
                })
              }
            >
              Dir xiriir xaqiijin
            </Button>
          </div>
        )}
      </section>

      <section className={card} aria-labelledby="password-title">
        <h2 id="password-title" className="text-lg font-bold">
          Beddel furaha sirta ah
        </h2>
        <form
          className="mt-6 grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
              setCurrentPassword("");
              setNewPassword("");
              toast.success("Furaha sirta ah waa la beddelay. Fadhiyada kale waa laga saaray.");
            });
          }}
        >
          <div>
            <Label htmlFor="current-password" className="mb-2">
              Furaha hadda
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
          <div>
            <Label htmlFor="new-password" className="mb-2">
              Furaha cusub
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 rounded-xl"
              minLength={10}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Ugu yaraan 10 xaraf, oo leh xaraf iyo lambar.</p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="h-11 rounded-xl px-6" disabled={pending}>
              Beddel furaha
            </Button>
          </div>
        </form>
      </section>

      <section className={card} aria-labelledby="sessions-title">
        <h2 id="sessions-title" className="text-lg font-bold">
          Fadhiyada
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Ka bax dhammaan qalabka aad ku gashay, oo ay ku jirto kan.</p>
        <Button
          variant="destructive"
          className="mt-4 h-10 rounded-xl"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await api("/api/auth/logout-all", { method: "POST" });
              router.push("/login");
              router.refresh();
            })
          }
        >
          Ka bax meel walba
        </Button>
      </section>
    </div>
  );
}
