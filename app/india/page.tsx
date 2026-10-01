import { SiteHeader } from "@/components/navigation/site-header";
import { PhasePlaceholder } from "@/components/ui/phase-placeholder";

export default function IndiaPage() {
  return (
    <>
      <SiteHeader />
      <PhasePlaceholder
        title="Charger discovery across India"
        description="The map, location search, and station results are intentionally reserved for the next phase. The route and API boundaries are ready."
      />
    </>
  );
}
