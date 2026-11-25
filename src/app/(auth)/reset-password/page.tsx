import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { tokenString } from "@/lib/validation";

export const metadata: Metadata = { title: "Deji furo cusub" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = tokenString.safeParse(sp.token);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Deji furo cusub</h1>
      {token.success ? (
        <>
          <p className="mt-1 mb-8 text-muted-foreground">Kadib, dhammaan fadhiyadaada hore waa laga saari doonaa.</p>
          <ResetPasswordForm token={token.data} />
        </>
      ) : (
        <p className="mt-4 text-muted-foreground">
          Xiriirkan ma saxna.{" "}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Codso xiriir cusub
          </Link>
        </p>
      )}
    </>
  );
}
