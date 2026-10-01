/**
 * SESSION 2 — "FIND A FAST CHARGER NEAR ME"
 * Persona: Driver with low battery
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

const DIR = 'qa-screenshots/02-nearby-fast';
async function snap(page: Page, name: string) {
  fs.mkdirSync(DIR, { recursive: true });
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}
function elapsed(start: number) { return `${((Date.now() - start) / 1000).toFixed(1)}s`; }

test.describe('Session 2: Nearby Fast Charger', () => {
  test('Find a fast charger near me', async ({ page, context }) => {
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;

    // Grant geolocation (Delhi center)
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    // STEP 1: Homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, '01-homepage');
    log.push(`[${elapsed(start)}] Homepage loaded`);

    // STEP 2: Find "Find Chargers Near Me" CTA
    const nearbyCTA = page.locator('a[href*="nearby=true"]').first();
    const nearbyVisible = await nearbyCTA.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Near Me CTA visible: ${nearbyVisible}`);

    if (nearbyVisible) {
      clicks++;
      await nearbyCTA.click();
      log.push(`[${elapsed(start)}] Clicked Near Me CTA`);
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ Near Me CTA not found!`);
      await page.goto('/map?nearby=true');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, '02-nearby-results');
    log.push(`[${elapsed(start)}] URL: ${page.url()}`);

    // STEP 3: Observe the map/results
    const mapEl = page.locator('.leaflet-container').first();
    const mapVisible = await mapEl.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Map visible: ${mapVisible}`);

    // Check for station list
    const stationItems = page.locator('a[href*="/station/"]');
    const stationCount = await stationItems.count();
    log.push(`[${elapsed(start)}] Station links visible: ${stationCount}`);

    // Check for markers
    const markers = page.locator('.leaflet-marker-icon');
    const markerCount = await markers.count();
    log.push(`[${elapsed(start)}] Map markers: ${markerCount}`);

    // STEP 4: Look for Fast / 50kW+ filter
    const allButtons = await page.locator('button, [role="button"], a').all();
    const filterTexts: string[] = [];
    for (const btn of allButtons) {
      const txt = await btn.innerText().catch(() => '');
      if (txt.trim()) filterTexts.push(txt.trim());
    }
    log.push(`[${elapsed(start)}] Available buttons/filters: ${filterTexts.slice(0, 30).join(' | ')}`);

    // Try to find power filter
    const fastFilter = page.locator('button, [role="button"], a').filter({ hasText: /fast|50.*kw|dc|rapid/i }).first();
    const fastFilterVisible = await fastFilter.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Fast filter visible: ${fastFilterVisible}`);

    if (fastFilterVisible) {
      clicks++;
      await fastFilter.click();
      await page.waitForTimeout(2000);
      await snap(page, '03-fast-filter-applied');
      log.push(`[${elapsed(start)}] Applied fast filter`);

      const newStationCount = await stationItems.count();
      const newMarkerCount = await markers.count();
      log.push(`[${elapsed(start)}] After filter - stations: ${newStationCount}, markers: ${newMarkerCount}`);
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ No Fast filter found! Checking for power slider or dropdown...`);
      // Look for any filter-related UI
      const filterUI = page.locator('[class*="filter"], [class*="power"], select, [class*="slider"]');
      const filterUICount = await filterUI.count();
      log.push(`[${elapsed(start)}] Filter-like UI elements: ${filterUICount}`);
      await snap(page, '03-no-fast-filter');
    }

    // STEP 5: Select a station
    const firstLink = stationItems.first();
    if (await firstLink.isVisible().catch(() => false)) {
      const linkText = await firstLink.innerText().catch(() => '');
      log.push(`[${elapsed(start)}] Selecting station: "${linkText.substring(0, 80)}"`);
      clicks++;
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, '04-station-details');
      log.push(`[${elapsed(start)}] Station details URL: ${page.url()}`);

      const pageText = await page.locator('body').innerText();
      log.push(`[${elapsed(start)}] Has kW info: ${/\d+\s*kw/i.test(pageText)}`);
      log.push(`[${elapsed(start)}] Has connector info: ${/ccs|type\s*2|chademo/i.test(pageText)}`);
      log.push(`[${elapsed(start)}] Has address: ${/pin\s*\d{6}|address|road|street|sector/i.test(pageText)}`);
      log.push(`[${elapsed(start)}] Has directions: ${/direction/i.test(pageText)}`);
    }

    // Assessment
    log.push(`\n========== SESSION 2 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}`);
    log.push(`Confusion events: ${confusionEvents}`);
    log.push(`Near Me CTA obvious: ${nearbyVisible ? 'YES' : 'NO'}`);
    log.push(`Map showed nearby: ${mapVisible ? 'YES' : 'UNKNOWN'}`);
    log.push(`Fast filter discoverable: ${fastFilterVisible ? 'YES' : 'NO'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});
