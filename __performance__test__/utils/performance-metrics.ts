import type { Page } from "@playwright/test";
import type { Metric } from "web-vitals";
import { reportWebVitals } from "web-vitals";

type PerformanceMetric = {
  name: string;
  value: number;
  page: string;
  timestamp: number;
};

type WebVitalMetric = {
  name: string;
  value: number;
  id: string;
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

  const webVitalsMetrics = await page.evaluate(() => {
    return new Promise<WebVitalMetric[]>((resolve) => {
      const results: WebVitalMetric[] = [];

      function captureMetric(metric: Metric) {
        results.push({
          name: metric.name,
          value: metric.value,
          id: metric.id,
        });

        if (results.length >= 5) {
          // LCP, FID, CLS, TTFB, FCP
          resolve(results);
        }
      }

      reportWebVitals(captureMetric);
    });
  });

  webVitalsMetrics.forEach((metric) => {
    metrics.push({
      name: metric.name,
      value: metric.value,
      page: pageName,
      timestamp: Date.now(),
    });
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
