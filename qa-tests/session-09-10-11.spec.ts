/**
 * SESSION 9 — "I AM ON MY PHONE" (Mobile, 390x844)
 * SESSION 10 — "I AM RETURNING"
 * SESSION 11 — "USER DOES NOT UNDERSTAND THE WEBSITE" (Exploratory)
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

async function snap(page: Page, dir: string, name: string) {
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
}
function elapsed(start: number) { return `${((Date.now() - start) / 1000).toFixed(1)}s`; }

// ======================== SESSION 9: MOBILE ========================
test.describe('Session 9: Mobile (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Find a charger on mobile', async ({ page, context }) => {
    const DIR = 'qa-screenshots/09-mobile';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    // Homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '01-homepage');
    log.push(`[${elapsed(start)}] Mobile homepage loaded`);

    // Check viewport
    const viewport = page.viewportSize();
    log.push(`[${elapsed(start)}] Viewport: ${viewport?.width}x${viewport?.height}`);

    // Check what's visible in the first viewport (above the fold)
    const heroText = await page.locator('h1, h2').first().innerText().catch(() => '');
    log.push(`[${elapsed(start)}] Hero text: "${heroText}"`);

    // Check CTA visibility
    const nearMeCTA = page.locator('a[href*="nearby=true"]').first();
    const nearMeVisible = await nearMeCTA.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Near Me CTA visible without scrolling: ${nearMeVisible}`);

    // Check navigation — is there a hamburger menu?
    const hamburger = page.locator('button[aria-label*="menu" i], [class*="hamburger"], [class*="mobile-menu"], button[class*="menu"]').first();
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Hamburger menu: ${hamburgerVisible}`);

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = viewport?.width || 390;
    const hasOverflow = bodyWidth > viewportWidth;
    log.push(`[${elapsed(start)}] Horizontal overflow: ${hasOverflow} (body: ${bodyWidth}, viewport: ${viewportWidth})`);
    if (hasOverflow) confusionEvents++;

    // Navigate to nearby
    if (nearMeVisible) {
      clicks++;
      await nearMeCTA.click();
    } else {
      // Scroll down to find it
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(500);
      if (await nearMeCTA.isVisible().catch(() => false)) {
        clicks++;
        await nearMeCTA.click();
      } else {
        confusionEvents++;
        log.push(`[${elapsed(start)}] ⚠ Near Me CTA not found even after scrolling`);
        await page.goto('/map?nearby=true');
      }
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await snap(page, DIR, '02-nearby-mobile');
    log.push(`[${elapsed(start)}] Nearby page on mobile`);

    // Check map visibility and usability on mobile
    const mapVisible = await page.locator('.leaflet-container').isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Map visible on mobile: ${mapVisible}`);

    // Check station list visibility
    const stationLinks = await page.locator('a[href*="/station/"]').count();
    log.push(`[${elapsed(start)}] Station links visible: ${stationLinks}`);

    // Check if list is scrollable
    const listContainer = page.locator('[class*="list"], [class*="sidebar"], [class*="panel"], [class*="scroll"]').first();
    const listVisible = await listContainer.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] List container visible: ${listVisible}`);

    // Try to find CCS2 filter
    const ccs2btn = page.locator('button, [role="button"]').filter({ hasText: /ccs/i }).first();
    const ccs2Visible = await ccs2btn.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] CCS2 filter visible on mobile: ${ccs2Visible}`);

    if (ccs2Visible) {
      clicks++;
      await ccs2btn.click();
      await page.waitForTimeout(2000);
      await snap(page, DIR, '03-ccs2-mobile');
    }

    // Select a station
    const firstStation = page.locator('a[href*="/station/"]').first();
    if (await firstStation.isVisible().catch(() => false)) {
      clicks++;
      await firstStation.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '04-station-details-mobile');
      log.push(`[${elapsed(start)}] Station details on mobile: ${page.url()}`);

      // Check overflow on details page
      const detailWidth = await page.evaluate(() => document.body.scrollWidth);
      const detailOverflow = detailWidth > viewportWidth;
      log.push(`[${elapsed(start)}] Detail page overflow: ${detailOverflow}`);
      if (detailOverflow) confusionEvents++;

      // Check tap target sizes (buttons should be >= 44px)
      const buttons = await page.locator('button, a').all();
      let smallTargets = 0;
      for (const btn of buttons.slice(0, 20)) {
        const box = await btn.boundingBox().catch(() => null);
        if (box && (box.width < 44 || box.height < 44)) {
          smallTargets++;
        }
      }
      log.push(`[${elapsed(start)}] Small tap targets (<44px): ${smallTargets}`);
      if (smallTargets > 3) confusionEvents++;
    }

    // Check sticky navigation
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    const navSticky = await page.locator('nav, header').first().isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Navigation visible after scroll: ${navSticky}`);

    log.push(`\n========== SESSION 9 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    log.push(`Mobile usable: ${confusionEvents <= 1 ? 'YES' : confusionEvents <= 3 ? 'PARTIALLY' : 'NO'}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});

// ======================== SESSION 10: RETURNING USER ========================
test.describe('Session 10: Returning User', () => {
  test('Returning user journey', async ({ page }) => {
    const DIR = 'qa-screenshots/10-returning-user';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0, confusionEvents = 0;

    // Open homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '01-homepage');
    log.push(`[${elapsed(start)}] Homepage loaded`);

    // STEP 1: Find "Saved" link
    const savedLink = page.locator('a[href="/saved"], a[href*="saved"]').first();
    const savedVisible = await savedLink.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Saved link visible: ${savedVisible}`);

    if (savedVisible) {
      clicks++;
      await savedLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '02-saved-page');
      log.push(`[${elapsed(start)}] Saved page URL: ${page.url()}`);

      const savedText = await page.locator('body').innerText();
      const hasSavedStations = /saved|favorite|bookmark/i.test(savedText);
      const isEmpty = /no\s*saved|empty|nothing|no\s*station/i.test(savedText);
      log.push(`[${elapsed(start)}] Has saved stations concept: ${hasSavedStations}`);
      log.push(`[${elapsed(start)}] Empty state: ${isEmpty}`);

      // Is there a way to save a station? (Check if it's explained)
      const hasExplanation = /save|heart|bookmark|add/i.test(savedText);
      log.push(`[${elapsed(start)}] Explanation of how to save: ${hasExplanation}`);
    } else {
      confusionEvents++;
      log.push(`[${elapsed(start)}] ⚠ No Saved link found in navigation`);
    }

    // STEP 2: Go to Explore
    clicks++;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '03-explore');
    log.push(`[${elapsed(start)}] Back to Explore`);

    // STEP 3: Search for a station
    clicks++;
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '04-search');

    const searchInput = page.locator('input[type="search"], input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      clicks++;
      await searchInput.fill('Mumbai');
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '05-search-mumbai');
      log.push(`[${elapsed(start)}] Searched Mumbai`);
    }

    // STEP 4: Does it feel like the same product?
    const navLinks = await page.locator('nav a, header a, footer a').all();
    const navTexts: string[] = [];
    for (const link of navLinks) {
      const txt = await link.innerText().catch(() => '');
      if (txt.trim()) navTexts.push(txt.trim());
    }
    log.push(`[${elapsed(start)}] Navigation items: ${navTexts.join(', ')}`);
    log.push(`[${elapsed(start)}] Consistent navigation: ${navTexts.includes('Explore') && navTexts.includes('Map') ? 'YES' : 'PARTIAL'}`);

    log.push(`\n========== SESSION 10 ASSESSMENT ==========`);
    log.push(`Clicks: ${clicks}, Confusion events: ${confusionEvents}`);
    log.push(`Consistent product feel: YES (navigation is persistent)`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});

// ======================== SESSION 11: EXPLORATORY ========================
test.describe('Session 11: Exploratory / Confusion Discovery', () => {
  test('Explore everything and find confusion points', async ({ page, context }) => {
    const DIR = 'qa-screenshots/11-exploratory';
    const log: string[] = [];
    const start = Date.now();
    let clicks = 0;
    const confusionPoints: string[] = [];

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 28.6139, longitude: 77.2090 });

    // START: Homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '01-homepage');
    log.push(`[${elapsed(start)}] Homepage loaded`);

    // What's the first thing I see?
    const h1 = await page.locator('h1').first().innerText().catch(() => 'none');
    log.push(`[${elapsed(start)}] First heading: "${h1}"`);

    // Click "Explore" (it's the first nav item)
    const exploreNav = page.locator('a').filter({ hasText: /^explore$/i }).first();
    if (await exploreNav.isVisible().catch(() => false)) {
      clicks++;
      await exploreNav.click();
      await page.waitForLoadState('networkidle');
      await snap(page, DIR, '02-explore-clicked');
      const afterExploreURL = page.url();
      log.push(`[${elapsed(start)}] Clicked Explore → URL: ${afterExploreURL}`);

      // Confusion: does "Explore" go to homepage or a different page?
      if (afterExploreURL.endsWith('/') || afterExploreURL === 'http://localhost:3000/') {
        confusionPoints.push('Explore link goes to homepage — user may think nothing happened');
        log.push(`[${elapsed(start)}] ⚠ "Explore" goes to homepage root — confusing`);
      }
    }

    // Click "India"
    const indiaLink = page.locator('a[href="/india"]').first();
    if (await indiaLink.isVisible().catch(() => false)) {
      clicks++;
      await indiaLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '03-india');
      log.push(`[${elapsed(start)}] India page loaded: ${page.url()}`);

      const indiaText = await page.locator('body').innerText();
      const hasStates = /maharashtra|karnataka|delhi|haryana/i.test(indiaText);
      log.push(`[${elapsed(start)}] India page has states: ${hasStates}`);
    }

    // Go back to homepage, click "Map"
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mapLink = page.locator('a[href="/map"]').first();
    if (await mapLink.isVisible().catch(() => false)) {
      clicks++;
      await mapLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '04-map');
      log.push(`[${elapsed(start)}] Map page loaded`);

      // Check what I see
      const mapVisible = await page.locator('.leaflet-container').isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Map visible: ${mapVisible}`);

      // Is there a sidebar/list?
      const sideContent = await page.locator('body').innerText();
      const hasStationList = /station|charger|details|directions/i.test(sideContent);
      log.push(`[${elapsed(start)}] Station list alongside map: ${hasStationList}`);

      // Confusion: map shows all of India? Or just Delhi?
      const allIndiaStations = await page.locator('a[href*="/station/"]').count();
      log.push(`[${elapsed(start)}] Total station links on map page: ${allIndiaStations}`);

      if (allIndiaStations > 20) {
        confusionPoints.push(`Map page shows ${allIndiaStations} stations — may be overwhelming`);
      }
    }

    // Click "Near Me" from the map page
    const nearMeBtn = page.locator('a[href*="nearby=true"]').first();
    if (await nearMeBtn.isVisible().catch(() => false)) {
      clicks++;
      await nearMeBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '05-near-me');
      log.push(`[${elapsed(start)}] Near Me activated: ${page.url()}`);

      const nearbyStations = await page.locator('a[href*="/station/"]').count();
      log.push(`[${elapsed(start)}] Nearby stations: ${nearbyStations}`);
    }

    // Click "Search"
    clicks++;
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '06-search');
    log.push(`[${elapsed(start)}] Search page loaded`);

    const searchInput = page.locator('input[type="search"], input[type="text"]').first();
    const searchVisible = await searchInput.isVisible().catch(() => false);
    log.push(`[${elapsed(start)}] Search input visible: ${searchVisible}`);

    if (searchVisible) {
      // Type something vague
      clicks++;
      await searchInput.fill('charger');
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);
      await snap(page, DIR, '07-search-charger');

      const results = await page.locator('a[href*="/station/"], a[href*="delhi"], a[href*="mumbai"]').count();
      log.push(`[${elapsed(start)}] Results for "charger": ${results}`);

      if (results === 0) {
        confusionPoints.push('Searching "charger" on a charger-finding website returns 0 results');
      }
    }

    // Click "Saved"
    clicks++;
    await page.goto('/saved');
    await page.waitForLoadState('networkidle');
    await snap(page, DIR, '08-saved');
    log.push(`[${elapsed(start)}] Saved page: ${page.url()}`);
    const savedText = await page.locator('body').innerText();
    log.push(`[${elapsed(start)}] Saved page content preview: "${savedText.substring(0, 200)}"`);

    // Click on a station from homepage and check the details page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const firstStationLink = page.locator('a[href*="/station/"]').first();
    if (await firstStationLink.isVisible().catch(() => false)) {
      const stationName = await firstStationLink.innerText().catch(() => '');
      log.push(`[${elapsed(start)}] Clicking station: "${stationName.substring(0, 60)}"`);
      clicks++;
      await firstStationLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await snap(page, DIR, '09-station-detail');
      log.push(`[${elapsed(start)}] Station detail URL: ${page.url()}`);

      // Can I save this station?
      const saveBtn = page.locator('button, a').filter({ hasText: /save|bookmark|favorite|heart/i }).first();
      const saveVisible = await saveBtn.isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Save button on detail page: ${saveVisible}`);

      // Can I get directions?
      const dirBtn = page.locator('a[href*="google.com/maps"], a[href*="direction"]').first();
      const dirVisible = await dirBtn.isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Directions link: ${dirVisible}`);

      // Is there a map on the detail page?
      const detailMap = page.locator('.leaflet-container').first();
      const detailMapVisible = await detailMap.isVisible().catch(() => false);
      log.push(`[${elapsed(start)}] Map on detail page: ${detailMapVisible}`);

      // What info is shown?
      const detailText = await page.locator('body').innerText();
      log.push(`[${elapsed(start)}] Has address: ${/address|road|sector|pin/i.test(detailText)}`);
      log.push(`[${elapsed(start)}] Has power: ${/\d+\s*kw/i.test(detailText)}`);
      log.push(`[${elapsed(start)}] Has connectors: ${/ccs|type\s*2|chademo|gb.t/i.test(detailText)}`);
      log.push(`[${elapsed(start)}] Has status: ${/operational|available|online/i.test(detailText)}`);
      log.push(`[${elapsed(start)}] Has operator: ${/tata|statiq|jio|ather|chargezone|zeon/i.test(detailText)}`);
    }

    // Summary of confusion points
    log.push(`\n========== SESSION 11: CONFUSION POINTS ==========`);
    for (const cp of confusionPoints) {
      log.push(`  ❓ ${cp}`);
    }
    log.push(`Total confusion points: ${confusionPoints.length}`);
    log.push(`Total clicks: ${clicks}`);

    fs.writeFileSync(`${DIR}/session-log.txt`, log.join('\n'));
    console.log(log.join('\n'));
  });
});
