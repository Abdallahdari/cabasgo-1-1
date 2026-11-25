import type { Metadata } from "next";
import { requirePageUser } from "@/server/auth/current-user";
import { getOwnProfile } from "@/server/services/user.service";
import { listRegions } from "@/server/services/catalog.service";
import { SettingsForms } from "@/components/settings-forms";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Dejinta" };

export default async function SettingsPage() {
  const user = await requirePageUser("/settings");
  const [profile, regions] = await Promise.all([getOwnProfile(user.id), listRegions()]);
  return (
    <PageShell title="Dejinta" description="Maamul akoonkaaga, amniga iyo ogeysiisyada.">
      <SettingsForms profile={profile} regions={regions} />
    </PageShell>
  );
}
