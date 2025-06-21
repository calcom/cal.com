import type { vi } from "vitest";
import { expect } from "vitest";

/**
 * Performance testing utilities for Office365 Calendar optimization tests
 * Consolidates performance testing patterns used across multiple test files
 */

export interface ApiCallMetrics {
  total: number;
  batch: number;
  individual: number;
  subscriptions: number;
  cache: number;
}

export interface PerformanceMetrics {
  executionTime: number;
  apiCalls: ApiCallMetrics;
  optimizationRatio: number;
}

export class PerformanceTestUtils {
  /**
   * Measures API calls from a fetcher spy
   */
  static measureApiCalls(fetcherSpy: ReturnType<typeof vi.fn>): ApiCallMetrics {
    const calls = fetcherSpy.mock.calls;

    const metrics: ApiCallMetrics = {
      total: calls.length,
      batch: 0,
      individual: 0,
      subscriptions: 0,
      cache: 0,
    };

    calls.forEach((call) => {
      const endpoint = call[0];
      const _options = call[1];

      if (typeof endpoint === "string") {
        if (endpoint.includes("/$batch")) {
          metrics.batch++;
        } else if (endpoint.includes("/subscriptions")) {
          metrics.subscriptions++;
        } else if (endpoint.includes("/calendarView") || endpoint.includes("/events")) {
          metrics.individual++;
        } else if (endpoint.includes("/cache")) {
          metrics.cache++;
        }
      }
    });

    return metrics;
  }

  /**
   * Validates that optimization is working correctly
   */
  static validateOptimization(apiCalls: ApiCallMetrics, totalCalendars: number): void {
    // Should use batch calls for multiple calendars
    if (totalCalendars > 1) {
      expect(apiCalls.batch).toBeGreaterThan(0);
    }

    // Total API calls should be much less than individual calendar calls
    expect(apiCalls.total).toBeLessThan(totalCalendars * 2);

    // Optimization ratio should be reasonable
    const optimizationRatio = apiCalls.total / totalCalendars;
    expect(optimizationRatio).toBeLessThan(1.5); // Should be significantly optimized
  }

  /**
   * Measures execution time for performance testing
   */
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    await operation();
    const endTime = Date.now();

    return {
      executionTime: endTime - startTime,
      apiCalls: {
        total: 0,
        batch: 0,
        individual: 0,
        subscriptions: 0,
        cache: 0,
      },
      optimizationRatio: 0,
    };
  }

  /**
   * Validates performance benchmarks
   */
  static validatePerformance(metrics: PerformanceMetrics, maxExecutionTime = 1000): void {
    expect(metrics.executionTime).toBeLessThan(maxExecutionTime);
  }

  /**
   * Creates performance test expectations for batch operations
   */
  static expectBatchOptimization(fetcherSpy: ReturnType<typeof vi.fn>, expectedBatchCalls = 1): void {
    const apiCalls = this.measureApiCalls(fetcherSpy);
    expect(apiCalls.batch).toBeGreaterThanOrEqual(expectedBatchCalls);
    expect(apiCalls.individual).toBeLessThan(apiCalls.batch * 3); // Should minimize individual calls
  }

  /**
   * Creates performance test expectations for team scenarios
   */
  static expectTeamOptimization(
    fetcherSpy: ReturnType<typeof vi.fn>,
    teamSize: number,
    calendarsPerMember: number
  ): void {
    const totalCalendars = teamSize * calendarsPerMember;
    const apiCalls = this.measureApiCalls(fetcherSpy);

    // Should be much more efficient than individual calls per calendar
    expect(apiCalls.total).toBeLessThan(totalCalendars);
    expect(apiCalls.batch).toBeGreaterThan(0);
  }

  /**
   * Creates performance test expectations for high-volume scenarios
   */
  static expectHighVolumeOptimization(
    fetcherSpy: ReturnType<typeof vi.fn>,
    totalItems: number,
    maxApiCalls: number
  ): void {
    const apiCalls = this.measureApiCalls(fetcherSpy);
    expect(apiCalls.total).toBeLessThan(maxApiCalls);
    expect(apiCalls.total).toBeLessThan(totalItems / 2); // Should be at least 50% more efficient
  }
}
