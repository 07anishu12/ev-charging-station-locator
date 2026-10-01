import type { Metadata } from "next";

export function createPageMetadata(
  title: string,
  description: string,
  siteUrl: string,
  path = "/",
): Metadata {
  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "FastCharger",
      type: "website",
    },
  };
}
