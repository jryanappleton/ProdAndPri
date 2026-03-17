import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { AppStateProvider } from "@/components/shared/AppStateProvider";
import { getBootstrapPayload } from "@/lib/server/app-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prod & Pri",
  description: "Today-first productivity workspace for v1.1 validation."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialPayload = await getBootstrapPayload();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppStateProvider initialPayload={initialPayload}>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
