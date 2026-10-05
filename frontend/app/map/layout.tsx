import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "EV Charging Station Map | FastCharger",
  description:
    "Explore provider-reported EV charging stations across India on an interactive map. Filter by charging speed, connector type, and network operator.",
  alternates: {
    canonical: absoluteUrl("/map"),
  },
  openGraph: {
    title: "EV Charging Station Map | FastCharger",
    description:
      "Explore provider-reported EV charging stations across India on an interactive map.",
    url: absoluteUrl("/map"),
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
