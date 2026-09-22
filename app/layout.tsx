import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/components/install-prompt";
import { ensureAuthBootstrap } from "@/lib/startup";
import "./globals.css";

export const dynamic = "force-dynamic";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Meals Planner";

export const metadata: Metadata = {
  title: appName,
  description: "Mobile-first meal planning and collaborative grocery list app.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#065f46",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await ensureAuthBootstrap();

  return (
    <html lang="en">
      <body>
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
