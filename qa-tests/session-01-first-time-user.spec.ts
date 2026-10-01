/**
 * SESSION 1 — "I JUST NEED A CHARGER"
 * Persona: First-time EV owner
 * Starting condition: Fresh browser, no cookies, no saved state, no prior knowledge
 * Task: "I need to find an EV charging station near me."
 */
import { test, expect, Page } from '@playwright/test';

const SESSION = '01-first-time-user';
const SCREENSHOTS_DIR = `qa-screenshots/${SESSION}`;

// Helper to take annotated screenshots
async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${name}.png`, fullPage: true });
}

// Helper to log timing
function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

test.describe('Session 1: First-Time User — "I Just Need a Charger"', () => {
  test('Complete first-time user journey', async ({ page, context }) => {
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0;
    let wrongClicks = 0;
    let confusionEvents = 0;
    let hesitations: string[] = [];
    let deadEnds: string[] = [];

    // ========== STEP 1: OBSERVE THE HOMEPAGE ==========
    log.push(`[${elapsed(start)}] Navigating to homepage`);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, '01-homepage-loaded');

    // Observe: What does the page look like?
    const title = await page.title();
    log.push(`[${elapsed(start)}] Page title: "${title}"`);

    // What text is visible on the page?
    const bodyText = await page.locator('body').innerText();
    log.push(`[${elapsed(start)}] Body text length: ${bodyText.length} chars`);

    // Look for obvious CTAs
    const buttons = await page.locator('button, a[role="button"], [class*="btn"], [class*="button"], a[href]').all();
    log.push(`[${elapsed(start)}] Found ${buttons.length} clickable elements`);

    // Document all visible CTA text
    const ctaTexts: string[] = [];
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => '');
      const href = await btn.getAttribute('href').catch(() => '');
      if (text.trim()) ctaTexts.push(`"${text.trim()}" ${href ? `(→${href})` : ''}`);
    }
    log.push(`[${elapsed(start)}] Visible CTAs:\n${ctaTexts.join('\n')}`);
    await snap(page, '02-cta-inventory');

    // ========== STEP 2: ASSESS INITIAL IMPRESSIONS ==========
    // "What do I think this website does?"
    const hasChargerMention = bodyText.toLowerCase().includes('charger') || bodyText.toLowerCase().includes('charging') || bodyText.toLowerCase().includes('ev');
    log.push(`[${elapsed(start)}] Website mentions charging/EV: ${hasChargerMention}`);

    // "What is the most obvious action?"
    const findNearby = page.getByText(/find.*charger|nearby|near me|find.*station/i).first();
    const nearbyVisible = await findNearby.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] "Find Chargers Near Me" CTA visible: ${nearbyVisible}`);

    // Check for search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i], input[placeholder*="city" i], input[placeholder*="location" i]').first();
    const searchVisible = await searchInput.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Search input visible: ${searchVisible}`);

    // Check for explore link
    const exploreLink = page.getByText(/explore/i).first();
    const exploreVisible = await exploreLink.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Explore link visible: ${exploreVisible}`);

    // Check for map link
    const mapLink = page.getByText(/map/i).first();
    const mapVisible = await mapLink.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Map link visible: ${mapVisible}`);

    // ========== STEP 3: ATTEMPT THE MOST OBVIOUS ACTION ==========
    // A first-time user will click the most prominent CTA
    log.push(`[${elapsed(start)}] === ATTEMPTING MOST OBVIOUS ACTION ===`);

    // Try "Find Chargers Near Me" or equivalent
    const primaryCTA = page.locator('a, button').filter({ hasText: /find.*charger|nearby|near me|explore.*charger|get started/i }).first();
    const primaryCTAVisible = await primaryCTA.isVisible().catch(() => false);

    if (primaryCTAVisible) {
      const ctaText = await primaryCTA.innerText();
      log.push(`[${elapsed(start)}] Clicking primary CTA: "${ctaText}"`);
      clicks++;
      await primaryCTA.click();
      await page.waitForLoadState('networkidle');
      await snap(page, '03-after-primary-cta');
      log.push(`[${elapsed(start)}] URL after click: ${page.url()}`);
    } else {
      log.push(`[${elapsed(start)}] ⚠ No obvious primary CTA found!`);
      confusionEvents++;
      hesitations.push('No obvious primary CTA on homepage');

      // Fallback: try clicking any link in the navigation
      const navLinks = page.locator('nav a, header a').first();
      if (await navLinks.isVisible().catch(() => false)) {
        const navText = await navLinks.innerText();
        log.push(`[${elapsed(start)}] Trying nav link: "${navText}"`);
        clicks++;
        await navLinks.click();
        await page.waitForLoadState('networkidle');
        await snap(page, '03-after-nav-click');
      }
    }

    // ========== STEP 4: LOOK FOR RESULTS ==========
    const timeToFirstAction = elapsed(start);
    log.push(`[${elapsed(start)}] Time to first action: ${timeToFirstAction}`);

    // Check if we're now looking at charger results
    const currentURL = page.url();
    const pageContent = await page.locator('body').innerText();

    // Look for station cards/list items
    const stationCards = page.locator('[class*="station"], [class*="card"], [class*="result"], [data-station], li').filter({
      hasText: /kw|charger|station|connector|charging/i
    });
    const stationCount = await stationCards.count();
    log.push(`[${elapsed(start)}] Station-like results found: ${stationCount}`);

    // Look for a map
    const mapElement = page.locator('[class*="map"], .leaflet-container, #map, [id*="map"]').first();
    const mapPresent = await mapElement.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Map visible: ${mapPresent}`);

    if (mapPresent) {
      await snap(page, '04-map-visible');
    }

    // ========== STEP 5: TRY SEARCH IF RESULTS NOT FOUND ==========
    if (stationCount === 0) {
      log.push(`[${elapsed(start)}] No results yet, trying search...`);
      confusionEvents++;

      const searchBox = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i], input[placeholder*="city" i], input[placeholder*="location" i], input[type="text"]').first();
      if (await searchBox.isVisible().catch(() => false)) {
        log.push(`[${elapsed(start)}] Found search box, typing "Delhi"`);
        clicks++;
        await searchBox.fill('Delhi');
        await searchBox.press('Enter');
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
        await snap(page, '05-search-delhi');

        const postSearchCards = await stationCards.count();
        log.push(`[${elapsed(start)}] Results after searching "Delhi": ${postSearchCards}`);
      } else {
        log.push(`[${elapsed(start)}] ⚠ No search box found either!`);
        deadEnds.push('No way to search for chargers');
        confusionEvents++;
      }
    }

    const timeToFirstResult = elapsed(start);
    log.push(`[${elapsed(start)}] Time to first useful result: ${timeToFirstResult}`);

    // ========== STEP 6: TRY TO SELECT A STATION ==========
    const firstStation = stationCards.first();
    if (await firstStation.isVisible().catch(() => false)) {
      const stationText = await firstStation.innerText().catch(() => '');
      log.push(`[${elapsed(start)}] First station text: "${stationText.substring(0, 100)}..."`);
      clicks++;
      await firstStation.click();
      await page.waitForTimeout(2000);
      await snap(page, '06-station-selected');
      log.push(`[${elapsed(start)}] URL after station click: ${page.url()}`);

      // Can the user understand the result?
      const detailContent = await page.locator('body').innerText();
      const hasAddress = /address|location|street|road|sector/i.test(detailContent);
      const hasPower = /kw|power|speed/i.test(detailContent);
      const hasConnector = /ccs|type|connector|plug/i.test(detailContent);
      const hasStatus = /operational|available|online|status/i.test(detailContent);

      log.push(`[${elapsed(start)}] Detail page shows: address=${hasAddress}, power=${hasPower}, connector=${hasConnector}, status=${hasStatus}`);
      await snap(page, '07-station-details');
    } else {
      log.push(`[${elapsed(start)}] ⚠ Could not find a station to select`);
      deadEnds.push('No selectable station');
      confusionEvents++;
    }

    // ========== FINAL ASSESSMENT ==========
    const totalTime = elapsed(start);
    log.push(`\n========== SESSION 1 ASSESSMENT ==========`);
    log.push(`Total time: ${totalTime}`);
    log.push(`Clicks: ${clicks}`);
    log.push(`Wrong clicks: ${wrongClicks}`);
    log.push(`Confusion events: ${confusionEvents}`);
    log.push(`Hesitations: ${hesitations.join(', ') || 'None'}`);
    log.push(`Dead ends: ${deadEnds.join(', ') || 'None'}`);

    const taskCompleted = stationCount > 0 || deadEnds.length === 0;
    log.push(`Task completed: ${taskCompleted ? 'YES' : 'NO'}`);
    log.push(`Could a first-time user complete this without help: ${confusionEvents <= 1 ? 'YES' : confusionEvents <= 3 ? 'PARTIALLY' : 'NO'}`);

    // Write session log
    const fs = require('fs');
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    fs.writeFileSync(`${SCREENSHOTS_DIR}/session-log.txt`, log.join('\n'));

    console.log(log.join('\n'));
  });
});
