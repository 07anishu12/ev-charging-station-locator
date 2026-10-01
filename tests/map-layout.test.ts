import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Explore / Map station-discovery layout architecture", () => {
  const mapPagePath = path.join(process.cwd(), "app/map/page.tsx");
  const mapViewPath = path.join(process.cwd(), "components/map/map-view.tsx");
  const layoutPath = path.join(process.cwd(), "app/layout.tsx");
  const togglePath = path.join(process.cwd(), "components/map/map-list-toggle.tsx");
  const bottomSheetPath = path.join(process.cwd(), "components/stations/station-bottom-sheet.tsx");
  const stationCardPath = path.join(process.cwd(), "components/stations/station-card.tsx");

  it("verifies Map page root container enforces viewport containment without document scrolling", () => {
    const content = fs.readFileSync(mapPagePath, "utf-8");

    // Must use 100dvh for viewport sizing and overflow-hidden to prevent document scroll
    expect(content).toContain("h-[calc(100dvh-4rem)] md:h-[100dvh]");
    expect(content).toContain("overflow-hidden");
  });

  it("verifies Header & Search/Filter section are shrink-0 and persistent", () => {
    const content = fs.readFileSync(mapPagePath, "utf-8");

    // Filter section must be shrink-0 so it never collapses or gets pushed away
    expect(content).toMatch(/<section[^>]*shrink-0[^>]*z-20/);
    expect(content).toContain("<SearchBar");
    expect(content).toContain("<FilterChips");
  });

  it("verifies desktop/tablet discovery viewport uses split-pane grid with independent scrolling", () => {
    const content = fs.readFileSync(mapPagePath, "utf-8");

    // Discovery viewport (<main>) must have min-h-0 and CSS grid columns for split pane
    expect(content).toContain("flex-1 min-h-0 w-full grid");
    expect(content).toMatch(/grid-cols-1 md:grid-cols-\[minmax\(360px,440px\)_minmax\(0,1fr\)\]/);

    // Left station-list container must have min-h-0 and overflow-y-auto
    expect(content).toMatch(/h-full min-h-0 overflow-y-auto[^>]*aria-label="Stations List"/);

    // Right map pane container must have min-h-0, overflow-hidden, and relative positioning
    expect(content).toMatch(/h-full min-h-0 relative overflow-hidden[^>]*aria-label="Interactive Map"/);

    // Map container inside right pane must be absolute inset-0 to fill 100% of the pane
    expect(content).toContain('<div className="absolute inset-0">');
  });

  it("verifies Leaflet MapView container uses absolute inset-0 and min-h-0", () => {
    const content = fs.readFileSync(mapViewPath, "utf-8");

    // MapView wrapper must allow shrinking (min-h-0)
    expect(content).toContain("min-h-0");

    // Container ref element must use absolute inset-0 to guarantee exact pixel bounding box
    expect(content).toContain('ref={containerRef} className="absolute inset-0 w-full h-full"');

    // Must utilize ResizeObserver to invalidateSize on layout shifts without interval loops
    expect(content).toContain("new ResizeObserver");
    expect(content).toContain("invalidateSize()");
    expect(content).toContain("resizeObserver.disconnect()");

    // Must bind station popups with details
    expect(content).toContain("marker.bindPopup");
    expect(content).toContain("marker.openPopup");
  });

  it("verifies responsive breakpoints for mobile vs tablet/desktop", () => {
    const mapContent = fs.readFileSync(mapPagePath, "utf-8");
    const toggleContent = fs.readFileSync(togglePath, "utf-8");
    const sheetContent = fs.readFileSync(bottomSheetPath, "utf-8");

    // MapPage switches between list/map on mobile and shows split-pane on md (768px+)
    expect(mapContent).toContain('mobileView === "list" ? "block" : "hidden md:block"');
    expect(mapContent).toContain('mobileView === "map" ? "block" : "hidden md:block"');

    // Mobile toggle is hidden on md+
    expect(toggleContent).toContain("md:hidden");

    // Mobile bottom sheet preview is hidden on md+
    expect(sheetContent).toContain("md:hidden");
  });

  it("verifies bidirectional linking between map markers and station cards", () => {
    const mapContent = fs.readFileSync(mapPagePath, "utf-8");
    const cardContent = fs.readFileSync(stationCardPath, "utf-8");

    // StationCard must have DOM id for scrollIntoView
    expect(cardContent).toContain('id={`station-card-${station.id}`}');

    // MapPage must scroll the card into view when a marker is clicked
    expect(mapContent).toContain("document.getElementById(`station-card-${station.id}`)");
    expect(mapContent).toContain("scrollIntoView({ behavior: \"smooth\", block: \"nearest\" })");
  });

  it("verifies RootLayout flex containment prevents flex child expansion bug", () => {
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    // RootLayout children wrapper must have min-h-0
    expect(layoutContent).toContain('className="flex-1 flex flex-col min-h-0"');
  });

  it("verifies station-to-map focus zoom, smooth flyTo, and race-condition handling", () => {
    const mapContent = fs.readFileSync(mapViewPath, "utf-8");

    // Must define and export STATION_FOCUS_ZOOM
    expect(mapContent).toContain("export const STATION_FOCUS_ZOOM = 16");

    // Must use smooth flyTo animation with STATION_FOCUS_ZOOM and duration
    expect(mapContent).toMatch(/map\.flyTo\(\[.*latitude.*longitude\],\s*STATION_FOCUS_ZOOM,\s*\{\s*duration:\s*0\.8/);

    // Selected marker must be elevated with high z-index and distinctive styling
    expect(mapContent).toContain("zIndexOffset: isSelected ? 1000 : 0");
    expect(mapContent).toContain("box-shadow: 0 0 0 3px #16C784");

    // Popup must expose Operator, Station name, status, speed, connectors, and details link
    expect(mapContent).toContain("station.operator.name");
    expect(mapContent).toContain("station.name");
    expect(mapContent).toContain("station.fastestPowerKw");
    expect(mapContent).toContain("station.connectors");
    expect(mapContent).toContain("View Details →");

    // Must protect against race condition when selected before map is loaded
    expect(mapContent).toContain("pendingFocusStationIdRef");
  });

  it("verifies station card selection styling and title interaction", () => {
    const cardContent = fs.readFileSync(stationCardPath, "utf-8");

    // Station card must have active ring and emerald background when selected
    expect(cardContent).toContain("bg-emerald-50/30");
    expect(cardContent).toContain("ring-[var(--color-primary)]/30");

    // When onSelect is present, clicking title selects card rather than navigating away
    expect(cardContent).toContain("onSelect ? (");
    expect(cardContent).toContain("Details");
  });
});
