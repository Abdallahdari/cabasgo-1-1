import type { Metadata } from "next";
import Link from "next/link";
import { MailWarning } from "lucide-react";
import { requirePageUser } from "@/server/auth/current-user";
import { getEnv } from "@/server/env";
import { listCategories, listRegions } from "@/server/services/catalog.service";
import { isStorageConfigured } from "@/server/storage";
import { ComplaintForm } from "@/components/complaints/complaint-form";

export const metadata: Metadata = { title: "Cabasho cusub" };

export default async function NewComplaintPage({ searchParams }: PageProps<"/complaints/new">) {
  const user = await requirePageUser("/complaints/new");
  const sp = await searchParams;
  const [categories, regions] = await Promise.all([listCategories(), listRegions()]);

  return (
    <div>
      <div className="mx-auto max-w-3xl rounded-lg border bg-card p-5 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Gudbi cabasho cusub</h1>
        <p className="mt-2 text-muted-foreground">
          Cabashadaadu waxay marka hore sugaysaa dib-u-eegis tifaftire ka hor inta aan la daabicin. Ha ku darin
          macluumaad gaar ah oo qof kale (lambarro taleefan, cinwaanno guri).
        </p>

        {getEnv().REQUIRE_EMAIL_VERIFICATION && !user.emailVerified ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#f0cf9a] bg-[#fff8ec] p-4 text-sm text-[#5c2d05]">
            <MailWarning className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              Si aad cabasho u gudbiso, marka hore xaqiiji email-kaaga.{" "}
              <Link href="/settings#email" className="font-semibold underline">
                Dir xiriir xaqiijin
              </Link>
            </p>
          </div>
        ) : null}

        <div className="mt-8">
          <ComplaintForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            regions={regions}
            defaultAnonymous={sp.anonymous === "1"}
            uploadsEnabled={isStorageConfigured()}
          />
        </div>
      </div>
    </div>
  );
}
