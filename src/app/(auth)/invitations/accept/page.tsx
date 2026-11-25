import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/server/auth/current-user";
import { inspectInvitation } from "@/server/services/invitation.service";
import { tokenString } from "@/lib/validation";

export const metadata: Metadata = { title: "Casuumad Tifaftire" };

export default async function AcceptInvitationPage({ searchParams }: PageProps<"/invitations/accept">) {
  const sp = await searchParams;
  const token = tokenString.safeParse(sp.token);
  const invitation = token.success ? await inspectInvitation(token.data) : null;
  const user = await getCurrentUser();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Casuumad Tifaftire</h1>
      {invitation && token.success ? (
        <>
          <p className="mt-1 mb-8 text-muted-foreground">
            Tifaftireyaashu waxay dib u eegaan cabashooyinka, cusbooneysiiyaan xaaladdooda, kana jawaabaan bulshada.
          </p>
          <AcceptInvitationForm
            token={token.data}
            email={invitation.email}
            hasAccount={invitation.hasAccount}
            signedInAs={user?.email ?? null}
          />
        </>
      ) : (
        <p className="mt-4 text-muted-foreground">
          Casuumaddan ma jirto, way dhacday, waa la joojiyay ama horay ayaa loo isticmaalay. Weydiiso maamulaha casuumad cusub.
        </p>
      )}
    </>
  );
}
