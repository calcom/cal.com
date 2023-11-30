import { chromium } from "@playwright/test";
import fs from "fs";
import { playAudit, type playwrightLighthouseConfig } from "playwright-lighthouse";

type LighthouseABTestOptions = Readonly<
  Partial<playwrightLighthouseConfig> & {
    sessionToken?: string;
    testCount?: number;
  }
>;

const runSingleTest = async (pageUrl: string, options: LighthouseABTestOptions) => {
  const browser = await chromium.launch({
    args: ["--remote-debugging-port=9222"],
    headless: false,
  });

  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: options.sessionToken ?? process.env.LIGHTHOUSE_TEST_SESSION_TOKEN ?? "",
      url: "http://localhost:3000",
    },
  ]);

  const page = await context.newPage();

  await page.goto(pageUrl);

  const report = await playAudit({
    page,
    ...options,
    ...DEFAULT_OPTIONS,
  });

  await browser.close();

  return report;
};

const buildEntry = (reports: any[], auditName: string, page: string) =>
  reports.reduce(
    (acc, { audits }, i) => {
      acc[`test_${i}`] = audits[auditName].numericValue.toFixed(2);
      return acc;
    },
    { audit: auditName, page: page.replace("localhost:3000", "") }
  );

const INCLUDED_AUDITS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "first-meaningful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
];

// rows of the table
const buildPageReportEntries = (page: string, reports: any[]) => {
  const parsedReports = reports.map((report) => JSON.parse(report.report));

  return INCLUDED_AUDITS.map((auditName) => {
    return buildEntry(parsedReports, auditName, page);
  });
};

const runABTestNTimes = async (page: string, options: LighthouseABTestOptions, times: number) => {
  const reports = [];

  for (let i = 0; i < times; i++) {
    const report = await runSingleTest(page, options);
    reports.push(report);
  }

  return reports;
};

const runLighthouseABTest = async (pageUrlPairs: [string, string][], options: LighthouseABTestOptions) => {
  const testCount = options.testCount ?? 5;

  for (const [pageA, pageB] of pageUrlPairs) {
    const reportsA = await runABTestNTimes(pageA, options, testCount);
    const reportsB = await runABTestNTimes(pageB, options, testCount);

    const reportAEntries = buildPageReportEntries(pageA, reportsA);
    const reportBEntries = buildPageReportEntries(pageB, reportsB);

    fs.writeFileSync(
      `${process.cwd()}/lighthouse/lighthouse-short-${Date.now()}.json`,
      JSON.stringify([...reportAEntries, ...reportBEntries])
    );
  }
};

const DEFAULT_OPTIONS = {
  port: 9222,
  opts: {
    onlyCategories: ["performance"],
  },
  thresholds: {
    performance: 0,
  },
  reports: {
    formats: {
      json: true,
    },
  },
};

const BASE_URL = "localhost:3000";

const PAGES = ["/apps/categories/messaging"];

const options: LighthouseABTestOptions = {
  testCount: 5,
};

const buildABTestPairs = (pages: string[]) =>
  pages.map((p) => [`${BASE_URL}${p}`, `${BASE_URL}/future${p}`] as [string, string]);
runLighthouseABTest(buildABTestPairs(PAGES), options);
