"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/api-client";
import { safeNextPath } from "@/lib/validation";

/** Same-site relative redirects only (no open redirects). */
const safeNext = (next: string | undefined) => safeNextPath(next);

function Field({
  id,
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string; hint?: string }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2">
        {label}
      </Label>
      <Input id={id} className="h-12 rounded-xl" {...props} />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-[15px]" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await api("/api/auth/login", { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
        router.push(safeNext(next));
        router.refresh();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <Field id="password" name="password" type="password" label="Furaha sirta ah" autoComplete="current-password" required />
      <div className="text-right">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Ma ilowday furaha?
        </Link>
      </div>
      <Submit pending={pending}>Gal</Submit>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        // Note: no role field — every self-registered account is a CITIZEN.
        await api("/api/auth/register", {
          method: "POST",
          body: { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") },
        });
        toast.success("Ku soo dhawoow! Akoonkaaga waa la sameeyay.");
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Field id="name" name="name" label="Magacaaga" autoComplete="name" required minLength={2} maxLength={80} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <Field
        id="password"
        name="password"
        type="password"
        label="Furaha sirta ah"
        autoComplete="new-password"
        required
        minLength={10}
        hint="Ugu yaraan 10 xaraf, oo leh xaraf iyo lambar."
      />
      <Submit pending={pending}>Samee akoon</Submit>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await api("/api/auth/forgot-password", { method: "POST", body: { email: fd.get("email") } });
        setSent(true);
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  if (sent) {
    return (
      <p className="rounded-xl bg-secondary p-4 text-sm" role="status">
        Haddii email-kaasi leeyahay akoon, waxaan u dirnay xiriir lagu dejiyo furo cusub. Xiriirku wuxuu dhacayaa 1 saac
        kadib.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <Submit pending={pending}>Dir xiriirka</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      setError("Labada furo isku mid ma aha.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await api("/api/auth/reset-password", { method: "POST", body: { token, password: fd.get("password") } });
        toast.success("Furaha cusub waa la dejiyay. Fadlan gal.");
        router.push("/login");
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <Field
        id="password"
        name="password"
        type="password"
        label="Furaha cusub"
        autoComplete="new-password"
        required
        minLength={10}
        hint="Ugu yaraan 10 xaraf, oo leh xaraf iyo lambar."
      />
      <Field id="confirm" name="confirm" type="password" label="Ku celi furaha" autoComplete="new-password" required />
      <Submit pending={pending}>Deji furaha</Submit>
    </form>
  );
}

export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api("/api/auth/verify-email", { method: "POST", body: { token } })
      .then(() => setState("ok"))
      .catch((err) => {
        setMessage(errorMessage(err));
        setState("error");
      });
  }, [token]);

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Waa la xaqiijinayaa…
      </p>
    );
  }
  if (state === "ok") {
    return (
      <div className="space-y-5" role="status">
        <p className="flex items-center gap-2 font-semibold text-emerald-700">
          <CheckCircle2 className="size-5" aria-hidden /> Email-kaaga waa la xaqiijiyay.
        </p>
        <Button asChild className="h-11 w-full rounded-xl">
          <Link href="/complaints/new">Gudbi cabasho</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4" role="alert">
      <p className="flex items-center gap-2 font-semibold text-red-700">
        <XCircle className="size-5" aria-hidden /> {message}
      </p>
      <p className="text-sm text-muted-foreground">
        Xiriir cusub waxaad ka codsan kartaa{" "}
        <Link href="/settings#email" className="font-semibold text-primary hover:underline">
          Dejinta
        </Link>
        .
      </p>
    </div>
  );
}

export function AcceptInvitationForm({ token, email, hasAccount, signedInAs }: { token: string; email: string; hasAccount: boolean; signedInAs: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await api("/api/invitations/accept", { method: "POST", body: { token, ...body } });
        toast.success("Hambalyo! Hadda waxaad tahay Tifaftire.");
        router.push("/admin");
        router.refresh();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  if (hasAccount) {
    const correctUser = signedInAs?.toLowerCase() === email.toLowerCase();
    return (
      <div className="space-y-5">
        <FormError message={error} />
        <p className="text-sm text-muted-foreground">
          Casuumaddan waxay u socotaa <strong className="text-foreground">{email}</strong>, oo horay akoon u leh.
        </p>
        {correctUser ? (
          <Button className="h-12 w-full rounded-xl" disabled={pending} onClick={() => accept({})}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Aqbal casuumadda
          </Button>
        ) : (
          <Button asChild className="h-12 w-full rounded-xl">
            <Link href={`/login?next=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}>
              Ku gal {email} si aad u aqbasho
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        accept({ name: fd.get("name"), password: fd.get("password") });
      }}
    >
      <FormError message={error} />
      <Field id="email" label="Email" value={email} disabled readOnly />
      <Field id="name" name="name" label="Magacaaga" autoComplete="name" required minLength={2} maxLength={80} />
      <Field
        id="password"
        name="password"
        type="password"
        label="Furaha sirta ah"
        autoComplete="new-password"
        required
        minLength={10}
        hint="Ugu yaraan 10 xaraf, oo leh xaraf iyo lambar."
      />
      <Submit pending={pending}>Samee akoon Tifaftire</Submit>
    </form>
  );
}
