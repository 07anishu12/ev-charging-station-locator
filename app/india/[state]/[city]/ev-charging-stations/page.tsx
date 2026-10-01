import { SiteHeader } from "@/components/navigation/site-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export default async function CityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  return (
    <>
      <SiteHeader />
      <PhasePlaceholder
        eyebrow={`India / ${state} / ${city}`}
        title={`EV charging stations in ${city}`}
        description="City-level station discovery is scaffolded and will use the same backend API boundary as the map experience."
      />
    </>
  );
}
