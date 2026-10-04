import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Saved EV Charging Stations | FastCharger",
  description: "View and manage your bookmarked electric vehicle charging stations.",
  alternates: {
    canonical: absoluteUrl("/saved"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
