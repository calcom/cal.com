import { chromium } from "@playwright/test";
import fs from "fs";
// @ts-expect-error type-definitions
import lighthouse from "lighthouse";
// @ts-expect-error type-definitions
import constants from "lighthouse/lighthouse-core/config/constants";
import yargs from "yargs";

type Preset = "desktop" | "mobile";

type Options = {
  sessionToken?: string;
  repeatTimes?: number;
  preset?: Preset;
  pages: string[];
};

const DEFAULT_TEST_COUNT = 3;

const DEFAULT_ONLY_AUDITS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "first-meaningful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
];

const PRESET_DESKTOP = {
  formFactor: "desktop",
  throttling: constants.throttling.desktopDense4G,
  screenEmulation: constants.screenEmulationMetrics.desktop,
  emulatedUserAgent: constants.userAgents.desktop,
};

const DEFAULT_OPTIONS = {
  port: 9222,
};

const getConfig = (preset: Preset) => ({
  extends: "lighthouse:default",
  settings: {
    onlyAudits: DEFAULT_ONLY_AUDITS,
    ...(preset === "desktop" && PRESET_DESKTOP),
  },
});

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
type TestRunner = (pageUrl: string, options: Options) => Promise<Audits>;

const reportToJSON = (report: any) => {
  const parsedReport = JSON.parse(report.report) as { audits: Record<string, { numericValue: number }> };

  return Object.entries(parsedReport.audits).reduce<Record<string, number>>((acc, [auditName, audit]) => {
    acc[auditName] = audit.numericValue;
    return acc;
  }, {});
};

const lighthouseTestRunner: TestRunner = async (pageUrl: string, options: Options) => {
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

  const report = await lighthouse(pageUrl, DEFAULT_OPTIONS, getConfig(options.preset ?? "desktop"));
  await browser.close();

  return reportToJSON(report);
};

const getSeries = async (page: string, options: Options) => {
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

const runTests = async (pageUrlPairs: [string, string][], options: Options) => {
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

const run = async () => {
  const rawArgs = process.argv.slice(2);

  const options = (await yargs(rawArgs)
    .option("repeatTimes", {
      describe: "Number of runs for each page",
      type: "number",
      default: 3,
    })
    .option("pages", {
      describe: "Array of page urls",
      demandOption: true,
      array: true,
      type: "string",
    })
    .option("sessionToken", {
      describe: "Session token",
      type: "string",
    })
    .option("preset", {
      description: "Preset type (desktop or mobile)",
      type: "string",
      choices: ["desktop", "mobile"],
      default: "desktop",
    }).argv) as Options;

  runTests(buildABTestPairs(options.pages), options);
};

run();
