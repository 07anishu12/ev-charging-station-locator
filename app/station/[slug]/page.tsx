import { SiteHeader } from "@/components/navigation/site-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <SiteHeader />
      <PhasePlaceholder
        eyebrow={`Station / ${slug}`}
        title="Station details are coming next"
        description="The station route is ready for normalized provider data, charger status, and directions once the PostGIS repository is connected."
      />
    </>
  );
}
