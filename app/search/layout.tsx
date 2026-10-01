import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Search EV Charging Stations | FastCharger",
  description:
    "Search across Indian cities, 6-digit PIN codes, charging networks, or specific charging stations.",
  alternates: {
    canonical: absoluteUrl("/search"),
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
