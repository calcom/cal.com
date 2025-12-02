import { expect, type Page } from "@playwright/test";

export type ChartLoadingState = "initial" | "loading" | "loaded" | "error";

export interface ChartLoadingResult {
  chartId: string | null;
  loadingState: ChartLoadingState;
  success: boolean;
  error?: string;
}

/**
 * Wait for all chart cards on the page to reach "loaded" state
 * @param page Playwright page object
 * @param timeout Maximum time to wait for all charts (default: 15000ms)
 * @returns Array of chart loading results
 */
export async function waitForAllChartsToLoad(page: Page, timeout = 15000): Promise<ChartLoadingResult[]> {
  const startTime = Date.now();
  const results: ChartLoadingResult[] = [];

  // Wait for at least one chart card to be visible
  await page.locator('[data-testid="chart-card"]').first().waitFor({ state: "visible", timeout });

  // Get all chart cards
  const chartCards = await page.locator('[data-testid="chart-card"]').all();

  if (chartCards.length === 0) {
    throw new Error("No chart cards found on the page");
  }

  // Wait for each chart to reach loaded state
  for (let i = 0; i < chartCards.length; i++) {
    const chart = chartCards[i];
    const remainingTime = timeout - (Date.now() - startTime);

    if (remainingTime <= 0) {
      throw new Error(`Timeout waiting for charts to load after ${timeout}ms`);
    }

    const chartId = await chart.getAttribute("data-chart-id");
    const result: ChartLoadingResult = {
      chartId,
      loadingState: "initial",
      success: false,
    };

    try {
      // Wait for this specific chart to reach loaded state
      await expect(chart).toHaveAttribute("data-loading-state", "loaded", {
        timeout: remainingTime,
      });

      result.loadingState = "loaded";
      result.success = true;
    } catch {
      // Get the actual state if it failed
      const actualState = await chart.getAttribute("data-loading-state");
      result.loadingState = (actualState as ChartLoadingState) || "initial";
      result.error = `Chart "${chartId}" failed to load. Current state: ${actualState}`;
      result.success = false;
    }

    results.push(result);
  }

  return results;
}

/**
 * Assert that all charts on the page have loaded successfully
 * @param page Playwright page object
 * @param timeout Maximum time to wait for all charts (default: 15000ms)
 */
export async function expectAllChartsToLoad(page: Page, timeout = 15000): Promise<void> {
  const results = await waitForAllChartsToLoad(page, timeout);

  const failedCharts = results.filter((r) => !r.success);

  if (failedCharts.length > 0) {
    const errorMessages = failedCharts.map((r) => r.error).join("\n");
    throw new Error(`${failedCharts.length} chart(s) failed to load:\n${errorMessages}`);
  }

  // Additional check: ensure no charts are in error state
  const errorCharts = page.locator('[data-testid="chart-card"][data-loading-state="error"]');
  const errorCount = await errorCharts.count();

  if (errorCount > 0) {
    const errorChartIds = await Promise.all(
      (await errorCharts.all()).map((chart) => chart.getAttribute("data-chart-id"))
    );
    throw new Error(`${errorCount} chart(s) are in error state: ${errorChartIds.join(", ")}`);
  }
}

/**
 * Get the loading state of a specific chart by its ID
 * @param page Playwright page object
 * @param chartId The chart ID (derived from title)
 * @returns The loading state of the chart
 */
export async function getChartLoadingState(page: Page, chartId: string): Promise<ChartLoadingState | null> {
  const chart = page.locator(`[data-testid="chart-card"][data-chart-id="${chartId}"]`);
  const state = await chart.getAttribute("data-loading-state");
  return state as ChartLoadingState | null;
}

/**
 * Wait for a specific chart to reach loaded state
 * @param page Playwright page object
 * @param chartId The chart ID (derived from title)
 * @param timeout Maximum time to wait (default: 10000ms)
 */
export async function waitForChartToLoad(page: Page, chartId: string, timeout = 10000): Promise<void> {
  const chart = page.locator(`[data-testid="chart-card"][data-chart-id="${chartId}"]`);
  await expect(chart).toHaveAttribute("data-loading-state", "loaded", { timeout });
}

/**
 * Get all chart IDs on the page
 * @param page Playwright page object
 * @returns Array of chart IDs
 */
export async function getAllChartIds(page: Page): Promise<string[]> {
  const chartCards = await page.locator('[data-testid="chart-card"]').all();
  const chartIds = await Promise.all(
    chartCards.map(async (chart) => {
      const id = await chart.getAttribute("data-chart-id");
      return id || "unknown";
    })
  );
  return chartIds;
}
