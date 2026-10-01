import React from "react";

import type { MockStation } from "@/lib/mock";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo/config";

/**
 * Universal JSON-LD container component
 */
export function JsonLd({
  schema,
}: {
  schema: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebSite schema with internal search action
 */
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Semantic BreadcrumbList schema
 */
export function buildBreadcrumbSchema(items: Array<{ name: string; path?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/**
 * Factual FAQPage schema for Answer Engine Optimization (AEO)
 */
export function buildFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Authoritative EV Charging Station schema
 * Only includes properties actually present in the database.
 */
export function buildStationSchema(station: MockStation, canonicalPath: string) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["CivicStructure", "ElectricVehicleChargingStation"],
    name: station.name,
    url: absoluteUrl(canonicalPath),
    address: {
      "@type": "PostalAddress",
      streetAddress: station.address,
      addressLocality: station.city.name,
      addressRegion: station.state.name,
      postalCode: station.pincode || undefined,
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: station.latitude,
      longitude: station.longitude,
    },
    provider: {
      "@type": "Organization",
      name: station.operator.name,
    },
    maximumPowerOutput: `${station.fastestPowerKw} kW`,
  };

  if (station.connectors && station.connectors.length > 0) {
    schema.amenityFeature = station.connectors.map((c) => ({
      "@type": "LocationFeatureSpecification",
      name: c.type,
      value: `${c.powerKw} kW`,
    }));
  }

  return schema;
}

/**
 * CollectionPage schema for state/city/PIN discovery corridors
 */
export function buildCollectionPageSchema({
  title,
  description,
  url,
  itemCount,
}: {
  title: string;
  description: string;
  url: string;
  itemCount: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: absoluteUrl(url),
    numberOfItems: itemCount,
  };
}
