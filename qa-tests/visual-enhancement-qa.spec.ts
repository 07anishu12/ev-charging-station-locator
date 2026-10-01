import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-393x852", width: 393, height: 852 },
  { name: "mobile-412x915", width: 412, height: 915 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const SCREENSHOT_DIR = path.join(process.cwd(), "qa-screenshots", "visual-enhancement");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

for (const vp of VIEWPORTS) {
  test(`Visual QA & Responsiveness on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Homepage loaded
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    // Verify no horizontal overflow
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(vp.width + 1);

    // Verify key elements exist
    await expect(page.locator("text=Find your next charging stop.")).toBeVisible();
    await expect(page.locator("section").first().getByRole("link", { name: /Find Chargers Near Me/ })).toBeVisible();

    // Screenshot Homepage Hero
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}-01-homepage-hero.png`),
    });

    // Scroll down to Fast Chargers section
    const fastSection = page.locator("text=Fast Chargers (60kW+)");
    if (await fastSection.isVisible()) {
      await fastSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}-02-fast-chargers-section.png`),
      });
    }

    // Scroll down to Why FastCharger
    const whySection = page.locator("text=Why FastCharger?");
    if (await whySection.isVisible()) {
      await whySection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}-03-why-fastcharger.png`),
      });
    }

    // Scroll to Bottom CTA
    const bottomCTA = page.locator("text=Find a charger near you");
    if (await bottomCTA.isVisible()) {
      await bottomCTA.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}-04-bottom-cta.png`),
      });
    }

    // 2. Map & Filter Interactions
    await page.goto("http://localhost:3000/map?nearby=true", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify filter chips exist and can be clicked
    const ccs2Filter = page.getByRole("button", { name: "CCS2", exact: true });
    if (await ccs2Filter.isVisible()) {
      await ccs2Filter.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}-05-map-filters.png`),
    });

    // 3. Search Page
    await page.goto("http://localhost:3000/search?q=110059", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}-06-search-results.png`),
    });
  });
}
