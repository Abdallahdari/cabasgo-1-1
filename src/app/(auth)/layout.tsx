import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-4 lg:px-8">
        <Brand />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-10">{children}</div>
      </main>
    </div>
  );
}
