import type { Metadata, Viewport } from "next";
// Self-hosted (bundled at build time) so Docker/CI builds need no network access to Google Fonts.
import "@fontsource-variable/public-sans";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Codka Bulshada", template: "%s · Codka Bulshada" },
  description:
    "Codka Bulshada — madal ay muwaadiniintu kaga warbixiyaan dhibaatooyinka adeegyada dadweynaha, una raacaan xalintooda.",
  applicationName: "Codka Bulshada",
  // The UI ships its own light theme; ask the Dark Reader extension not to recolour it.
  other: { "darkreader-lock": "" },
};

// Every page receives a per-request CSP nonce from src/proxy.ts, which
// requires dynamic rendering (a static page's scripts would carry no nonce).
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#1a5db5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="so" className="h-full antialiased">
      <body className="min-h-full bg-canvas text-foreground">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
