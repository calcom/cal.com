import type { Page } from "@playwright/test";
import type { CLSMetric, FCPMetric, FIDMetric, INPMetric, LCPMetric, TTFBMetric } from "web-vitals";
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from "web-vitals";

type PerformanceMetric = {
  name: string;
  value: number;
  page: string;
  timestamp: number;
};

export async function measurePageLoad(page: Page, pageName: string): Promise<PerformanceMetric[]> {
  const metrics: PerformanceMetric[] = [];
  const startTime = Date.now();
  await page.waitForLoadState("networkidle");
  const loadTime = Date.now() - startTime;
  metrics.push({
    name: "page-load-time",
    value: loadTime,
    page: pageName,
    timestamp: Date.now(),
  });

  const webVitalsMetricsPromise = page.evaluate(() => {
    return new Promise<PerformanceMetric[]>((resolve) => {
      const localMetrics: PerformanceMetric[] = [];

      onCLS((metric: CLSMetric) => {
        localMetrics.push({
          name: metric.name,
          value: metric.value,
          page: "__PAGE_NAME__",
          timestamp: Date.now(),
        });
      });

      onFCP((metric: FCPMetric) => {
        localMetrics.push({
          name: metric.name,
          value: metric.value,
          page: "__PAGE_NAME__",
          timestamp: Date.now(),
        });
      });

      onFID((metric: FIDMetric) => {
        localMetrics.push({
          name: metric.name,
          value: metric.value,
          page: "__PAGE_NAME__",
          timestamp: Date.now(),
        });
      });

      onINP((metric: INPMetric) => {
        localMetrics.push({
          name: metric.name,
          value: metric.value,
          page: "__PAGE_NAME__",
          timestamp: Date.now(),
        });
      });

      onLCP((metric: LCPMetric) => {
        localMetrics.push({
          name: metric.name,
          value: metric.value,
          page: "__PAGE_NAME__",
          timestamp: Date.now(),
        });
      });

      onTTFB((metric: TTFBMetric) => {
        localMetrics.push({
          name: metric.name,
          value: metric.value,
          page: "__PAGE_NAME__",
          timestamp: Date.now(),
        });
        // Resolve the promise after TTFB is reported as it's a good indicator of initial load completion
        resolve(localMetrics);
      });
    });
  });

  const webVitalsMetrics = await webVitalsMetricsPromise;

  // Replace the placeholder page name with the actual pageName
  webVitalsMetrics.forEach((metric) => {
    metric.page = pageName;
    metrics.push(metric);
  });

  return metrics;
}

export function generateReport(allMetrics: PerformanceMetric[]) {
  const report = {
    summary: {},
    byPage: {},
    timestamp: Date.now(),
  };
  allMetrics.forEach((metric) => {
    if (!report.byPage[metric.page]) {
      report.byPage[metric.page] = {};
    }
    if (!report.byPage[metric.page][metric.name]) {
      report.byPage[metric.page][metric.name] = [];
    }
    report.byPage[metric.page][metric.name].push(metric.value);
  });
  Object.keys(report.byPage).forEach((page) => {
    report.summary[page] = {};
    Object.keys(report.byPage[page]).forEach((metricName) => {
      const values = report.byPage[page][metricName];
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      report.summary[page][metricName] = average;
    });
  });
  return report;
}
