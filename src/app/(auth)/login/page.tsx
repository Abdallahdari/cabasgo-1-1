import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/server/auth/current-user";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Gal" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  // Normalize here so an attacker-controlled absolute URL never reaches the page.
  const next = safeNextPath(sp.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Ku soo dhawoow</h1>
      <p className="mt-1 mb-8 text-muted-foreground">Gal akoonkaaga si aad u gudbiso oo ula socoto cabashooyinka.</p>
      <LoginForm next={next === "/" ? undefined : next} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Akoon ma lihid?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Is diiwaangeli
        </Link>
      </p>
    </>
  );
}
