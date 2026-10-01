import { SiteHeader } from "@/components/navigation/site-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  return (
    <>
      <SiteHeader />
      <PhasePlaceholder
        eyebrow={`India / ${state}`}
        title={`EV charging stations in ${state}`}
        description="State-level station discovery is scaffolded and will be connected to the normalized PostGIS dataset in the next phase."
      />
    </>
  );
}
