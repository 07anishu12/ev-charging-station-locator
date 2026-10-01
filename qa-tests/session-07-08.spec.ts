/**
 * SESSION 7 — "I CHANGED MY MIND" (Filter State Coherence)
 * SESSION 8 — "I WANT TO USE THE MAP" (Map Discovery)
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

async function snap(page: Page, dir: string, name: string) {
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
}
function elapsed(start: number) { return `${((Date.now() - start) / 1000).toFixed(1)}s`; }

// ======================== SESSION 7 ========================
test.describe('Session 7: Filter State Coherence', () => {
  test('Change mind repeatedly — filter state', async ({ page, context }) => {
    const DIR = 'qa-screenshots/07-filter-state';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;
    const stateSnapshots: { step: string; stations: number; markers: number; url: string }[] = [];

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    // Start: Nearby
    await page.goto('/map?nearby=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, DIR, '01-nearby');

    const getState = async (step: string) => {
      const stations = await page.locator('a[href*="/station/"]').count();
      const markers = await page.locator('.leaflet-marker-icon').count();
      const url = page.url();
      stateSnapshots.push({ step, stations, markers, url });
      log.push(`[${elapsed(start)}] STATE "${step}" — stations: ${stations}, markers: ${markers}, url: ${url}`);
      return { stations, markers };
    };

    await getState('initial-nearby');

    // Helper to try clicking a filter
    const tryFilter = async (pattern: RegExp, label: string, snapName: string): Promise<boolean> => {
      const btn = page.locator('button, [role="button"], label, a').filter({ hasText: pattern }).first();
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        clicks++;
        await btn.click();
        await page.waitForTimeout(2000);
        await snap(page, DIR, snapName);
        await getState(label);
        return true;
      }
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ "${label}" filter not found`);
      return false;
    };

    // Apply CCS2
    await tryFilter(/ccs/i, 'after-CCS2', '02-ccs2');

    // Apply 100kW+
    await tryFilter(/100.*kw|ultra/i, 'after-100kW', '03-100kw');

    // Apply Type 2
    await tryFilter(/type\s*2/i, 'after-Type2', '04-type2');

    // Apply Operational
    await tryFilter(/operational|available|online|status/i, 'after-Operational', '05-operational');

    // Reset all
    const resetBtn = page.locator('button, [role="button"], a').filter({ hasText: /reset|clear|all/i }).first();
    const resetVisible = await resetBtn.isVisible().catch(() => false);
    if (resetVisible) {
      clicks++;
      await resetBtn.click();
      await page.waitForTimeout(2000);
      await snap(page, DIR, '06-reset');
      await getState('after-reset');
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ No reset button found!`);
    }

    // Nearby again
    const nearbyBtn = page.locator('a[href*="nearby=true"], button').filter({ hasText: /nearby|near\s*me/i }).first();
    if (await nearbyBtn.isVisible().catch(() => false)) {
      clicks++;
      await nearbyBtn.click();
      await page.waitForTimeout(3000);
      await snap(page, DIR, '07-nearby-again');
      await getState('nearby-again');
    } else {
      await page.goto('/map?nearby=true');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '07-nearby-again');
      await getState('nearby-again-via-url');
    }

    // Coherence check
    log.push(`\n--- STATE HISTORY ---`);
    for (const s of stateSnapshots) {
      log.push(`  ${s.step}: stations=${s.stations}, markers=${s.markers}`);
    }

    // Check: do list and map agree?
    for (const s of stateSnapshots) {
      if (s.stations > 0 && s.markers === 0) {
        confusionEvents++;
        log.push(`⚠ STATE MISMATCH at "${s.step}": stations=${s.stations} but markers=0`);
      }
    }

    log.push(`\n========== SESSION 7 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    log.push(`Coherent mental model maintained: ${confusionEvents === 0 ? 'YES' : 'NO'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});

// ======================== SESSION 8 ========================
test.describe('Session 8: Map Discovery', () => {
  test('Find a charger by exploring the map', async ({ page, context }) => {
    const DIR = 'qa-screenshots/08-map-discovery';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    // Go to map
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, DIR, '01-map-initial');
    log.push(`[${elapsed(start)}] Map loaded`);

    const mapEl = page.locator('.leaflet-container').first();
    const mapVisible = await mapEl.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Map container visible: ${mapVisible}`);

    // Check markers
    const markers = page.locator('.leaflet-marker-icon');
    let markerCount = await markers.count();
    log.push(`[${elapsed(start)}] Initial markers: ${markerCount}`);

    // Zoom in (use zoom control if available)
    const zoomIn = page.locator('.leaflet-control-zoom-in, a[title="Zoom in"]').first();
    if (await zoomIn.isVisible().catch(() => false)) {
      for (let i = 0; i < 3; i++) {
        clicks++;
        await zoomIn.click();
        await page.waitForTimeout(1000);
      }
      await snap(page, DIR, '02-zoomed-in');
      markerCount = await markers.count();
      log.push(`[${elapsed(start)}] Markers after zoom: ${markerCount}`);
    }

    // Click a marker
    const marker = markers.first();
    if (await marker.isVisible().catch(() => false)) {
      clicks++;
      await marker.click();
      await page.waitForTimeout(2000);
      await snap(page, DIR, '03-marker-clicked');

      // Check popup
      const popup = page.locator('.leaflet-popup, .leaflet-popup-content, [class*="popup"]');
      const popupVisible = await popup.isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Popup visible after marker click: ${popupVisible}`);

      if (popupVisible) {
        const popupText = await popup.innerText().catch(() => '');
        log.push(`[${elapsed(start)}] Popup content: "${popupText.substring(0, 150)}"`);
        const hasUsefulInfo = /station|charger|kw|address|direction/i.test(popupText);
        log.push(`[${elapsed(start)}] Popup has useful info: ${hasUsefulInfo}`);

        // Try clicking details link in popup
        const detailLink = popup.locator('a[href*="/station/"]').first();
        if (await detailLink.isVisible().catch(() => false)) {
          clicks++;
          await detailLink.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          await snap(page, DIR, '04-station-from-popup');
          log.push(`[${elapsed(start)}] Navigated to station from popup: ${page.url()}`);

          // Go back
          clicks++;
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          await snap(page, DIR, '05-back-to-map');
          log.push(`[${elapsed(start)}] Back to map, can continue exploring`);

          const markersAfter = await markers.count();
          log.push(`[${elapsed(start)}] Markers after return: ${markersAfter}`);
        }
      } else {
        // Maybe the station is selected in the list sidebar instead
        log.push(`[${elapsed(start)}] No popup — checking if list item was highlighted`);
        const activeCard = page.locator('[class*="active"], [class*="selected"], [aria-selected="true"]');
        const activeVisible = await activeCard.isVisible().catch(() => false);
        log.push(`[${elapsed(start)}] Active/selected card visible: ${activeVisible}`);
      }
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ No markers to click!`);
    }

    // Check list synchronization
    const listStations = await page.locator('a[href*="/station/"]').count();
    log.push(`[${elapsed(start)}] Station links in list: ${listStations}`);

    // Try clicking a station from the list and check map behavior
    if (listStations > 0) {
      const secondStation = page.locator('a[href*="/station/"]').nth(1);
      if (await secondStation.isVisible().catch(() => false)) {
        const text = await secondStation.innerText().catch(() => '');
        log.push(`[${elapsed(start)}] Clicking list station: "${text.substring(0, 80)}"`);
        // Note: don't click the link directly as it navigates away
        // Instead check if there's a non-navigating select mechanism
      }
    }

    log.push(`\n========== SESSION 8 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    log.push(`Map markers discoverable: ${markerCount > 0 ? 'YES' : 'NO'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});
