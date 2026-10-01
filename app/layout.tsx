import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FastCharger | Find your next charging stop.",
    template: "%s | FastCharger",
  },
  description: "Find EV charging stations across India.",
};

import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col pb-16 md:pb-0">
        <div className="flex-1 flex flex-col">{children}</div>
        <MobileBottomNav />
      </body>
    </html>
  );
}
