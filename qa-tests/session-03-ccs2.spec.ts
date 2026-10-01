/**
 * SESSION 3 — "I HAVE A CCS2 CAR"
 * Persona: EV driver who knows "I need CCS2"
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

const DIR = 'qa-screenshots/03-ccs2';
async function snap(page: Page, name: string) {
  fs.mkdirSync(DIR, { recursive: true });
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}
function elapsed(start: number) { return `${((Date.now() - start) / 1000).toFixed(1)}s`; }

test.describe('Session 3: CCS2 Filter', () => {
  test('Find a CCS2 charger near me', async ({ page, context }) => {
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;
    const criticalFailures: string[] = [];

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    // Go to map with nearby
    await page.goto('/map?nearby=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, '01-map-loaded');
    log.push(`[${elapsed(start)}] Map page loaded`);

    // Record initial state
    const initialStations = await page.locator('a[href*="/station/"]').count();
    const initialMarkers = await page.locator('.leaflet-marker-icon').count();
    log.push(`[${elapsed(start)}] Initial - stations: ${initialStations}, markers: ${initialMarkers}`);

    // STEP 1: Find CCS2 filter
    const allText = await page.locator('body').innerText();
    const hasCCS2mention = /ccs2|ccs\s*2|ccs/i.test(allText);
    log.push(`[${elapsed(start)}] CCS2 mentioned on page: ${hasCCS2mention}`);

    // Look for CCS2 filter button/option
    const ccs2Filter = page.locator('button, [role="button"], label, a, input[type="checkbox"]').filter({ hasText: /ccs/i }).first();
    const ccs2Visible = await ccs2Filter.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] CCS2 filter element visible: ${ccs2Visible}`);

    if (ccs2Visible) {
      const filterText = await ccs2Filter.innerText().catch(() => '');
      log.push(`[${elapsed(start)}] CCS2 filter text: "${filterText}"`);
      clicks++;
      await ccs2Filter.click();
      await page.waitForTimeout(2000);
      await snap(page, '02-ccs2-applied');

      // Check visual feedback
      const ccs2Classes = await ccs2Filter.getAttribute('class').catch(() => '');
      const isActive = /active|selected|checked|pressed|bg-/i.test(ccs2Classes || '');
      log.push(`[${elapsed(start)}] Filter appears active (visual): ${isActive}`);
      if (!isActive) {
        confusionEvents++;
        log.push(`[${elapsed(start)}] ⚠ Cannot tell if CCS2 filter was applied (FAIL UX)`);
      }

      // Check results changed
      const newStations = await page.locator('a[href*="/station/"]').count();
      const newMarkers = await page.locator('.leaflet-marker-icon').count();
      log.push(`[${elapsed(start)}] After CCS2 - stations: ${newStations}, markers: ${newMarkers}`);

      // CRITICAL: List and map must agree
      if (newStations !== initialStations && newMarkers === initialMarkers) {
        criticalFailures.push('List changed but map did NOT update after CCS2 filter');
        log.push(`[${elapsed(start)}] ❌ CRITICAL FAIL: List changed but map did NOT update`);
      }
      if (newMarkers !== initialMarkers && newStations === initialStations) {
        criticalFailures.push('Map changed but list did NOT update after CCS2 filter');
        log.push(`[${elapsed(start)}] ❌ CRITICAL FAIL: Map changed but list did NOT update`);
      }
      if (newStations === initialStations && newMarkers === initialMarkers) {
        log.push(`[${elapsed(start)}] ⚠ Neither list nor map changed - filter may not work or all stations have CCS2`);
      }
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ CCS2 filter NOT discoverable!`);
      criticalFailures.push('User cannot find CCS2 filter');

      // Try looking in dropdown, sidebar, etc.
      const selectElements = await page.locator('select').count();
      log.push(`[${elapsed(start)}] Select dropdowns on page: ${selectElements}`);
      const filterContainers = await page.locator('[class*="filter"], [class*="sidebar"], [class*="panel"]').count();
      log.push(`[${elapsed(start)}] Filter containers: ${filterContainers}`);
      await snap(page, '02-no-ccs2-filter');
    }

    // STEP 2: Select a station
    const stationLink = page.locator('a[href*="/station/"]').first();
    if (await stationLink.isVisible().catch(() => false)) {
      clicks++;
      await stationLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, '03-station-details');

      const detailText = await page.locator('body').innerText();
      const hasCCS2 = /ccs2|ccs\s*2/i.test(detailText);
      log.push(`[${elapsed(start)}] Station details mention CCS2: ${hasCCS2}`);
    }

    // Assessment
    log.push(`\n========== SESSION 3 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}`);
    log.push(`Confusion events: ${confusionEvents}`);
    log.push(`CCS2 filter discoverable: ${ccs2Visible ? 'YES' : 'NO'}`);
    log.push(`Critical failures: ${criticalFailures.length > 0 ? criticalFailures.join('; ') : 'None'}`);
    log.push(`Task completed: ${ccs2Visible && criticalFailures.length === 0 ? 'YES' : 'NO'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});
