/**
 * SESSION 4 — "I NEED 100KW+"
 * SESSION 5 — "I ONLY KNOW THE PIN CODE"
 * SESSION 6 — "I MADE A MISTAKE"
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

async function snap(page: Page, dir: string, name: string) {
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
}
function elapsed(start: number) { return `${((Date.now() - start) / 1000).toFixed(1)}s`; }

// ======================== SESSION 4 ========================
test.describe('Session 4: 100kW+ Filter', () => {
  test('Find a 100kW+ charger', async ({ page, context }) => {
    const DIR = 'qa-screenshots/04-100kw';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    await page.goto('/map?nearby=true');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, DIR, '01-map-loaded');
    log.push(`[${elapsed(start)}] Map loaded`);

    const initialStations = await page.locator('a[href*="/station/"]').count();
    log.push(`[${elapsed(start)}] Initial stations: ${initialStations}`);

    // Look for 100kW+ filter
    const kwFilter = page.locator('button, [role="button"], label, a').filter({ hasText: /100.*kw|ultra|super/i }).first();
    const kwVisible = await kwFilter.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] 100kW+ filter visible: ${kwVisible}`);

    // Also check for a min-power slider/input
    const powerInput = page.locator('input[type="range"], input[type="number"]').first();
    const powerInputVisible = await powerInput.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Power input/slider visible: ${powerInputVisible}`);

    if (kwVisible) {
      clicks++;
      await kwFilter.click();
      await page.waitForTimeout(2000);
      await snap(page, DIR, '02-100kw-applied');

      const filtered = await page.locator('a[href*="/station/"]').count();
      log.push(`[${elapsed(start)}] After 100kW filter - stations: ${filtered}`);

      // Compare stations: check if power is visible
      const firstCard = page.locator('a[href*="/station/"]').first();
      if (await firstCard.isVisible().catch(() => false)) {
        const cardText = await firstCard.innerText().catch(() => '');
        log.push(`[${elapsed(start)}] First station card: "${cardText.substring(0, 120)}"`);
        const hasPowerInfo = /\d+\s*kw/i.test(cardText);
        log.push(`[${elapsed(start)}] Power info visible in card: ${hasPowerInfo}`);
        if (!hasPowerInfo) confusionEvents++;
      }
    } else if (powerInputVisible) {
      log.push(`[${elapsed(start)}] Using power input instead`);
      await powerInput.fill('100');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '02-power-input-100');
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ No 100kW filter found!`);

      // Try URL parameter
      await page.goto('/map?nearby=true&minPower=100');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '02-url-param-100kw');
      const urlStations = await page.locator('a[href*="/station/"]').count();
      log.push(`[${elapsed(start)}] URL param attempt - stations: ${urlStations}`);
    }

    // Select and inspect a station
    const link = page.locator('a[href*="/station/"]').first();
    if (await link.isVisible().catch(() => false)) {
      clicks++;
      await link.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '03-station-details');
      log.push(`[${elapsed(start)}] Station URL: ${page.url()}`);

      const text = await page.locator('body').innerText();
      log.push(`[${elapsed(start)}] Power specs visible: ${/\d+\s*kw/i.test(text)}`);

      // Go back
      clicks++;
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '04-back-to-map');
      const afterBack = await page.locator('a[href*="/station/"]').count();
      log.push(`[${elapsed(start)}] Stations after going back: ${afterBack}`);
    }

    log.push(`\n========== SESSION 4 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});

// ======================== SESSION 5 ========================
test.describe('Session 5: PIN Code 110059', () => {
  test('Find chargers around PIN 110059', async ({ page }) => {
    const DIR = 'qa-screenshots/05-pin-110059';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;
    const criticalFailures: string[] = [];

    // Go to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '01-homepage');
    log.push(`[${elapsed(start)}] Homepage loaded`);

    // STEP 1: Find search
    const searchLink = page.locator('a[href="/search"], a[href*="search"]').first();
    if (await searchLink.isVisible().catch(() => false)) {
      clicks++;
      await searchLink.click();
      await page.waitForLoadState('networkidle');
      await snap(page, DIR, '02-search-page');
      log.push(`[${elapsed(start)}] Search page loaded: ${page.url()}`);
    }

    // STEP 2: Look for search input
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="pin" i], input[placeholder*="city" i]').first();
    const inputVisible = await searchInput.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Search input visible: ${inputVisible}`);

    if (inputVisible) {
      clicks++;
      await searchInput.fill('110059');
      await page.waitForTimeout(500);
      await snap(page, DIR, '03-typed-110059');
      log.push(`[${elapsed(start)}] Typed 110059`);

      // Press Enter or look for search button
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
      await snap(page, DIR, '04-search-results');
      log.push(`[${elapsed(start)}] URL after search: ${page.url()}`);

      // Check results
      const resultText = await page.locator('body').innerText();
      const stationLinks = await page.locator('a[href*="/station/"]').count();
      log.push(`[${elapsed(start)}] Station links found: ${stationLinks}`);

      const hasNoResults = /no\s*result|not\s*found|no\s*station|empty|0\s*station/i.test(resultText);
      log.push(`[${elapsed(start)}] "No results" message: ${hasNoResults}`);

      const hasDistance = /\d+(\.\d+)?\s*(km|mi|m\b|meter)/i.test(resultText);
      log.push(`[${elapsed(start)}] Distance shown: ${hasDistance}`);

      // Check map
      const mapVisible = await page.locator('.leaflet-container').isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Map visible: ${mapVisible}`);
      if (mapVisible) {
        const markers = await page.locator('.leaflet-marker-icon').count();
        log.push(`[${elapsed(start)}] Map markers: ${markers}`);
      }

      if (hasNoResults && stationLinks === 0) {
        criticalFailures.push('UI says "No results" for PIN 110059 but nearby stations likely exist geographically');
        log.push(`[${elapsed(start)}] ❌ CRITICAL UX FAILURE: No results for valid PIN code`);
      }
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ No search input found!`);

      // Try the search page directly
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      await snap(page, DIR, '03-search-page-direct');

      // Check if there's a PIN code link for 110059
      const pinLink = page.locator('a[href*="110059"]').first();
      const pinLinkVisible = await pinLink.isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Direct PIN link for 110059: ${pinLinkVisible}`);

      if (pinLinkVisible) {
        clicks++;
        await pinLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        await snap(page, DIR, '04-pin-results');
        log.push(`[${elapsed(start)}] PIN page URL: ${page.url()}`);

        const pinStations = await page.locator('a[href*="/station/"]').count();
        log.push(`[${elapsed(start)}] Stations at PIN 110059: ${pinStations}`);
      }
    }

    // Also try the direct URL
    log.push(`\n--- Direct URL test ---`);
    await page.goto('/india/delhi/delhi/110059/ev-charging-stations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, DIR, '05-direct-pin-url');
    log.push(`[${elapsed(start)}] Direct URL loaded: ${page.url()}`);

    const directStations = await page.locator('a[href*="/station/"]').count();
    log.push(`[${elapsed(start)}] Stations via direct URL: ${directStations}`);

    const directText = await page.locator('body').innerText();
    const nearbyMentioned = /nearby|surrounding|close|within|radius/i.test(directText);
    log.push(`[${elapsed(start)}] Nearby stations mentioned: ${nearbyMentioned}`);

    log.push(`\n========== SESSION 5 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    log.push(`Critical failures: ${criticalFailures.length > 0 ? criticalFailures.join('; ') : 'None'}`);
    log.push(`PIN code understood as location: ${!criticalFailures.length ? 'YES' : 'NEEDS VERIFICATION'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});

// ======================== SESSION 6 ========================
test.describe('Session 6: Error Recovery', () => {
  test('Recover from search mistakes', async ({ page }) => {
    const DIR = 'qa-screenshots/06-error-recovery';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '01-search-page');
    log.push(`[${elapsed(start)}] Search page loaded`);

    // STEP 1: Search 999999 (invalid)
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="pin" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      clicks++;
      await searchInput.fill('999999');
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '02-search-999999');

      const resultText = await page.locator('body').innerText();
      const hasError = /no\s*result|not\s*found|invalid|error|no\s*station/i.test(resultText);
      log.push(`[${elapsed(start)}] Error/empty state shown: ${hasError}`);
      log.push(`[${elapsed(start)}] URL: ${page.url()}`);

      // STEP 2: Clear and search Delhi
      clicks++;
      await searchInput.clear();
      await searchInput.fill('Delhi');
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '03-search-delhi');

      const delhiStations = await page.locator('a[href*="/station/"], a[href*="delhi"]').count();
      log.push(`[${elapsed(start)}] Delhi results: ${delhiStations}`);

      // Check if old results (999999) are gone
      const pageText = await page.locator('body').innerText();
      const oldResultsRemain = /999999/.test(pageText);
      if (oldResultsRemain) {
        confusionEvents++;
        log.push(`[${elapsed(start)}] ⚠ Old search '999999' still visible!`);
      }
    }

    // STEP 3: Go to Explore
    clicks++;
    const exploreLink = page.locator('a[href="/"], a').filter({ hasText: /^explore$/i }).first();
    if (await exploreLink.isVisible().catch(() => false)) {
      await exploreLink.click();
    } else {
      await page.goto('/');
    }
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '04-explore');
    log.push(`[${elapsed(start)}] Navigated to Explore: ${page.url()}`);

    // STEP 4: Go to Map and check filters
    clicks++;
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, DIR, '05-map');
    log.push(`[${elapsed(start)}] Map page loaded`);

    // Look for filter buttons
    const filterButtons = page.locator('button, [role="button"]').filter({ hasText: /ccs|type|kw|fast|operational|reset|clear/i });
    const filterCount = await filterButtons.count();
    log.push(`[${elapsed(start)}] Filter buttons found: ${filterCount}`);

    // Apply a filter if available
    const anyFilter = filterButtons.first();
    if (await anyFilter.isVisible().catch(() => false)) {
      const filterText = await anyFilter.innerText().catch(() => '');
      log.push(`[${elapsed(start)}] Applying filter: "${filterText}"`);
      clicks++;
      await anyFilter.click();
      await page.waitForTimeout(2000);
      await snap(page, DIR, '06-filter-applied');

      // Look for reset
      const resetBtn = page.locator('button, [role="button"], a').filter({ hasText: /reset|clear|remove/i }).first();
      const resetVisible = await resetBtn.isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Reset button visible: ${resetVisible}`);

      if (resetVisible) {
        clicks++;
        await resetBtn.click();
        await page.waitForTimeout(2000);
        await snap(page, DIR, '07-reset');
        log.push(`[${elapsed(start)}] Filters reset`);
      }
    }

    // STEP 5: Search again
    clicks++;
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '08-search-again');

    // Check: is search box clean?
    const searchBox = page.locator('input[type="search"], input[type="text"]').first();
    if (await searchBox.isVisible().catch(() => false)) {
      const value = await searchBox.inputValue().catch(() => '');
      log.push(`[${elapsed(start)}] Search box value on return: "${value}"`);
      if (value) {
        confusionEvents++;
        log.push(`[${elapsed(start)}] ⚠ Search box retains old value!`);
      }
    }

    log.push(`\n========== SESSION 6 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    log.push(`User can recover naturally: ${confusionEvents === 0 ? 'YES' : 'PARTIALLY'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});
