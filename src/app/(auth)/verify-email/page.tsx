import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/auth-forms";
import { tokenString } from "@/lib/validation";

export const metadata: Metadata = { title: "Xaqiiji email-ka" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const sp = await searchParams;
  const token = tokenString.safeParse(sp.token);
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Xaqiijinta email-ka</h1>
      {token.success ? <VerifyEmail token={token.data} /> : <p className="text-muted-foreground">Xiriirkan ma saxna.</p>}
    </>
  );
}
