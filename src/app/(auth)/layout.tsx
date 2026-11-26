import { CircleCheck, EyeOff, Hammer } from "lucide-react";
import { Brand } from "@/components/brand";
import { getPlatformStats } from "@/server/services/complaint.service";
import { compactNumber } from "@/lib/format";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const stats = await getPlatformStats().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1080px] items-center px-4 lg:hidden">
        <Brand />
      </header>
      <main
        id="main"
        className="mx-auto grid w-full max-w-[1080px] flex-1 items-center gap-10 px-4 pt-2 pb-16 lg:grid-cols-[1fr_420px] lg:gap-16 lg:py-16"
      >
        <section className="hidden lg:block" aria-label="Ku saabsan Codka Bulshada">
          <Brand className="[&>span:first-child]:size-11 [&>span:last-child]:text-[26px]" />
          <p className="mt-6 max-w-[30ch] text-[30px] leading-[1.15] font-bold tracking-[-0.02em] text-balance">
            Cod kasta waa la maqlayaa. Ka warbixi, la soco, arag xalka.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-foreground/85">
            <li className="flex items-center gap-3">
              <EyeOff className="size-5 text-[#6d3fc0]" aria-hidden /> Ka warbixi magacaaga ama si qarsoodi ah
            </li>
            <li className="flex items-center gap-3">
              <Hammer className="size-5 text-[#b45309]" aria-hidden /> La soco xaaladda cabashada tallaabo tallaabo
            </li>
            <li className="flex items-center gap-3">
              <CircleCheck className="size-5 text-[#17803d]" aria-hidden /> Ogeysiis hel marka la xaliyo
            </li>
          </ul>
          {stats ? (
            <dl className="mt-10 flex gap-10 border-t pt-6">
              {[
                ["La daabacay", stats.published],
                ["Shaqo socota", stats.inProgress],
                ["La xaliyay", stats.resolved],
              ].map(([label, value]) => (
                <div key={label as string} className="flex flex-col-reverse">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="tabular text-2xl font-bold">{compactNumber(value as number)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
        <div className="mx-auto w-full max-w-[420px] rounded-lg border bg-card p-6 shadow-[0_2px_12px_rgba(22,26,33,0.06)] sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
