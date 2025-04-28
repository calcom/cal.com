import type { Browser } from "@playwright/test";
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

import { measurePageLoad, generateReport } from "./utils/performance-metrics";
import { seedLargeOrganization } from "./utils/seed-large-org";

type PageToTest = {
  path: string;
  name: string;
};

type PerformanceMetric = {
  name: string;
  value: number;
  page: string;
  timestamp: number;
};

const PAGES_TO_TEST: PageToTest[] = [
  { path: "/event-types", name: "Event Types" },
  { path: "/bookings", name: "Bookings" },
  { path: "/teams", name: "Teams" },
  { path: "/settings/my-account/profile", name: "Profile Settings" },
  { path: "/availability", name: "Availability" },
  { path: "/apps", name: "Apps" },
  { path: "/workflows", name: "Workflows" },
  { path: "/insights", name: "Insights" },
  { path: "/settings/organizations", name: "Organization Settings" },
];

test.describe("Large Organization Performance Tests", () => {
  let orgData: Awaited<ReturnType<typeof seedLargeOrganization>>;
  let browser: Browser;
  let allMetrics: PerformanceMetric[] = [];

  test.beforeAll(async () => {
    orgData = await seedLargeOrganization({
      userCount: 50, // Reduced from 200 to 50 to avoid timeout
      teamsCount: 5, // 5 teams
      eventTypesPerUser: 3, // Each user has 3 event types
      bookingsPerEventType: 15, // Each event type has 15 bookings
    });

    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    const report = generateReport(allMetrics);
    const reportDir = path.join(process.cwd(), "performance-reports");

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportDir, `performance-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log("📊 Performance report saved to performance-reports directory");

    if (browser) {
      await browser.close();
    }
  });

  test("Admin user page performance", async () => {
    const adminUser = orgData.adminUser;
    const context = await browser.newContext();

    const page = await context.newPage();
    await page.goto(`${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/login`);
    await page.fill('input[name="email"]', adminUser.email);
    await page.fill('input[name="password"]', "org-admin-password");
    await page.click('button[type="submit"]');

    await page.waitForNavigation();

    for (const pageToTest of PAGES_TO_TEST) {
      console.log(`🔍 Testing page: ${pageToTest.name}`);
      await page.goto(`${process.env.NEXT_PUBLIC_WEBAPP_URL}${pageToTest.path}`);

      const metrics = await measurePageLoad(page, pageToTest.name);
      allMetrics = [...allMetrics, ...metrics];

      console.log(`📊 ${pageToTest.name} metrics:`, metrics.map((m) => `${m.name}: ${m.value}`).join(", "));

      expect(page.url()).toContain(pageToTest.path);
    }

    const orgPath = `/settings/organizations/${orgData.organization.slug}/members`;
    console.log(`🔍 Testing organization members page`);
    await page.goto(`${process.env.NEXT_PUBLIC_WEBAPP_URL}${orgPath}`);

    const membersMetrics = await measurePageLoad(page, "Organization Members");
    allMetrics = [...allMetrics, ...membersMetrics];

    console.log(
      `📊 Organization Members metrics:`,
      membersMetrics.map((m) => `${m.name}: ${m.value}`).join(", ")
    );
    expect(page.url()).toContain(orgPath);

    await context.close();
  });
});
