import { SiteHeader } from "@/components/navigation/site-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export default async function PincodePage({
  params,
}: {
  params: Promise<{ state: string; city: string; pincode: string }>;
}) {
  const { state, city, pincode } = await params;
  return (
    <>
      <SiteHeader />
      <PhasePlaceholder
        eyebrow={`India / ${state} / ${city} / ${pincode}`}
        title={`EV charging stations near ${pincode}`}
        description="PIN-code discovery is scaffolded for a validated, location-aware search experience."
      />
    </>
  );
}
