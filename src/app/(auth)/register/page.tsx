import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Is diiwaangeli" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Samee akoon</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        Ku biir Codka Bulshada. Waxaad gudbin kartaa cabashooyin — xitaa si qarsoodi ah.
      </p>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Horay akoon ma u leedahay?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Gal
        </Link>
      </p>
    </>
  );
}
