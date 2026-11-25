import Link from "next/link";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <BrandMark className="size-14" />
      <h1 className="text-2xl font-bold">Boggan lama helin</h1>
      <p className="max-w-sm text-muted-foreground">
        Boggan ma jiro, waa la tirtiray, ama ogolaansho uma lihid inaad aragto.
      </p>
      <Link href="/" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
        Bogga hore
      </Link>
    </main>
  );
}
