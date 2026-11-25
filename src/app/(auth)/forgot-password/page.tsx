import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Ilowday furaha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Ma ilowday furaha sirta ah?</h1>
      <p className="mt-1 mb-8 text-muted-foreground">Geli email-kaaga, waxaan kuu soo diri doonnaa xiriir aad ku dejiso furo cusub.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Dib ugu noqo galitaanka
        </Link>
      </p>
    </>
  );
}
