import { chromium } from "@playwright/test";
import fs from "fs";
// @ts-expect-error type-definition
import lighthouse from "lighthouse";
import { type playwrightLighthouseConfig } from "playwright-lighthouse";

type LighthouseABTestOptions = Readonly<
  Partial<playwrightLighthouseConfig> & {
    sessionToken?: string;
    repeatTimes?: number;
    includeAudits?: string[];
  }
>;

const DEFAULT_TEST_COUNT = 3;

const DEFAULT_INCLUDED_AUDITS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "first-meaningful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
];

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

// utils
const times = async (n: number, cb: (...args: any) => any): Promise<any[]> => {
  const result = new Array(n);

  for (let i = 0; i < n; i++) {
    result[i] = await cb();
  }

  return result;
};

const median = (values: number[]): number => {
  if (values.length === 0) {
    throw new Error("Input array is empty");
  }

  values = [...values].sort((a, b) => a - b);

  const half = Math.floor(values.length / 2);

  return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2;
};

// test runner
type Audits = Record<string, number>;
type TestRunner = (pageUrl: string, options: LighthouseABTestOptions) => Promise<Audits>;

const reportToJSON = (report: any, options: LighthouseABTestOptions) => {
  const includeAudits = options.includeAudits ?? DEFAULT_INCLUDED_AUDITS;
  const parsedReport = JSON.parse(report.report) as { audits: Record<string, { numericValue: number }> };

  return Object.entries(parsedReport.audits).reduce<Record<string, number>>((acc, [auditName, audit]) => {
    if (!includeAudits.includes(auditName)) {
      return acc;
    }

    acc[auditName] = audit.numericValue;

    return acc;
  }, {});
};

const lighthouseTestRunner: TestRunner = async (pageUrl: string, options: LighthouseABTestOptions) => {
  const browser = await chromium.launch({
    args: ["--remote-debugging-port=9222"],
    headless: false,
  });

  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: options.sessionToken ?? "",
      url: "http://localhost:3000",
    },
  ]);

  await context.newPage();

  const report = await lighthouse(pageUrl, { ...options, ...DEFAULT_OPTIONS });

  console.log(report, "???");

  await browser.close();

  return reportToJSON(report, options);
};

const getSeries = async (page: string, options: LighthouseABTestOptions) => {
  const repeatTimes = options.repeatTimes ?? DEFAULT_TEST_COUNT;

  const audits = await times(repeatTimes, () => lighthouseTestRunner(page, options));

  return audits.reduce((acc, audit) => {
    Object.entries(audit).forEach(([key, value]) => {
      if (acc[key] === undefined) {
        acc[key] = [];
      }

      acc[key].push(value);
    });

    return acc;
  }, {});
};

const aggregateSeries = (series: Record<string, number[]>, aggregateFn: (values: number[]) => number) => {
  return Object.entries(series).reduce((acc, [auditName, auditValues]) => {
    acc[auditName] = aggregateFn(auditValues);

    return acc;
  }, {} as Record<string, number>);
};

const compare = (aggregate1: Record<string, number>, aggregate2: Record<string, number>) => {
  const deltaObj: Record<string, number> = {};
  const percentageObj: Record<string, number> = {};

  Object.keys(aggregate1).forEach((auditName) => {
    const delta = aggregate1[auditName] - aggregate2[auditName];
    const percentage = delta / aggregate1[auditName];

    deltaObj[auditName] = delta;
    percentageObj[auditName] = percentage;
  });

  return [deltaObj, percentageObj];
};

const runTests = async (pageUrlPairs: [string, string][], options: LighthouseABTestOptions) => {
  for (const [pageA, pageB] of pageUrlPairs) {
    const sA = await getSeries(pageA, options);

    // get aggregates: median, arithmetic mean or quartiles
    const aggregatedA = aggregateSeries(sA, median);

    const sB = await getSeries(pageB, options);
    const aggregatedB = aggregateSeries(sB, median);

    // delta, percentage or UTest
    const deltas = compare(aggregatedA, aggregatedB);

    fs.writeFileSync(
      `${process.cwd()}/lighthouse/lighthouse-short-${Date.now()}.json`,
      JSON.stringify([aggregatedA, aggregatedB, ...deltas])
    );
  }
};

const BASE_URL = "http://localhost:3000";

const buildABTestPairs = (pages: string[]) =>
  pages.map((p) => [`${BASE_URL}${p}`, `${BASE_URL}/future${p}`] as [string, string]);

const parseArgs = (args: string[]): { repeatTimes: number; pages: string[]; sessionToken: string } => {
  let repeatTimes = 5;
  let pages: string[] = [];
  let sessionToken = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sessionToken" || args[i] === "-s") {
      sessionToken = args[i + 1];
      i++;
    }

    if (args[i] === "--repeatTimes" || args[i] === "-r") {
      repeatTimes = parseInt(args[i + 1], 10);
      i++;
    }

    if (args[i] === "--pages" || args[i] === "-p") {
      const pagesArgs = args[i + 1].split(",");
      pages = pages.concat(pagesArgs);
      i++;
    }
  }

  return { repeatTimes, pages, sessionToken };
};

const run = () => {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  runTests(buildABTestPairs(options.pages), options);
};

run();
