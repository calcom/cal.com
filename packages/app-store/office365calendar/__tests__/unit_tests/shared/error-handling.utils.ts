import { vi } from "vitest";
import { expect } from "vitest";

/**
 * Error handling utilities for Office365 Calendar tests
 * Consolidates error testing patterns used across multiple test files
 */

export interface ErrorScenario {
  name: string;
  error: () => Error;
  expectedBehavior: string;
  shouldRetry?: boolean;
  retryCount?: number;
}

/**
 * Error scenarios for testing error handling and retry logic
 */
export const ErrorHandlingTestUtils = {
  ERROR_SCENARIOS: {
    NETWORK_ERROR: {
      name: "Network Error",
      error: () => new Error("Network request failed"),
      expectedBehavior: "Should retry with exponential backoff",
      shouldRetry: true,
      retryCount: 3,
    },
    RATE_LIMITED: {
      name: "Rate Limited",
      error: () => new Error("TooManyRequests"),
      expectedBehavior: "Should retry with exponential backoff",
      shouldRetry: true,
      retryCount: 3,
    },
    AUTH_ERROR: {
      name: "Authentication Error",
      error: () => new Error("InvalidAuthenticationToken"),
      expectedBehavior: "Should refresh token and retry",
      shouldRetry: true,
      retryCount: 2,
    },
    SUBSCRIPTION_ERROR: {
      name: "Subscription Error",
      error: () => new Error("Subscription operation failed"),
      expectedBehavior: "Should handle gracefully and log error",
      shouldRetry: false,
      retryCount: 0,
    },
    CALENDAR_NOT_FOUND: {
      name: "Calendar Not Found",
      error: () => new Error("Calendar not found"),
      expectedBehavior: "Should handle gracefully and continue",
      shouldRetry: false,
      retryCount: 0,
    },
    CACHE_ERROR: {
      name: "Cache Error",
      error: () => new Error("Cache update failed"),
      expectedBehavior: "Should handle gracefully and continue",
      shouldRetry: false,
      retryCount: 0,
    },
  },

  /**
   * Creates a mock that returns failed HTTP responses for testing
   */
  createErrorMock(scenario: ErrorScenario, callsBeforeError = 0): ReturnType<typeof vi.fn> {
    let callCount = 0;
    return vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount > callsBeforeError) {
        return Promise.resolve({
          status: 500,
          ok: false,
          statusText: "Internal Server Error",
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({
            error: {
              code: "InternalServerError",
              message: scenario.error().message,
            },
          }),
          text: async () =>
            JSON.stringify({
              error: {
                code: "InternalServerError",
                message: scenario.error().message,
              },
            }),
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({}),
      });
    });
  },

  /**
   * Creates a mock that fails then succeeds (for retry testing)
   */
  createRetryMock(scenario: ErrorScenario, failureCount = 1): ReturnType<typeof vi.fn> {
    let callCount = 0;
    return vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= failureCount) {
        return Promise.resolve({
          status: 429, // Rate limited
          ok: false,
          statusText: "Too Many Requests",
          headers: new Headers({ "Content-Type": "application/json", "Retry-After": "60" }),
          json: async () => ({
            error: {
              code: "TooManyRequests",
              message: scenario.error().message,
            },
          }),
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () =>
          Promise.resolve({
            id: "subscription-123",
            resource: "calendars/calendar123/events",
            changeType: "updated",
            notificationUrl: "https://example.com/webhook",
            expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
          }),
      });
    });
  },

  /**
   * Validates error handling behavior
   */
  expectErrorHandling(
    mockFn: ReturnType<typeof vi.fn>,
    scenario: ErrorScenario,
    expectedCalls: number
  ): void {
    expect(mockFn).toHaveBeenCalledTimes(expectedCalls);

    if (scenario.shouldRetry) {
      expect(expectedCalls).toBeGreaterThan(1);
    }
  },

  /**
   * Creates test expectations for graceful error handling
   */
  expectGracefulFailure(result: any, errorMessage: string, shouldContinueProcessing = true): void {
    if (shouldContinueProcessing) {
      expect(result).toBeDefined();
      expect(result.errors).toContain(expect.stringContaining(errorMessage));
    } else {
      expect(result).toBeNull();
    }
  },

  /**
   * Creates test expectations for retry behavior
   */
  expectRetryBehavior(mockFn: ReturnType<typeof vi.fn>, maxRetries: number, actualCalls: number): void {
    expect(actualCalls).toBeLessThanOrEqual(maxRetries + 1); // Initial call + retries
    expect(mockFn).toHaveBeenCalledTimes(actualCalls);
  },

  /**
   * Creates test expectations for fallback behavior
   */
  expectFallbackBehavior(
    primaryMock: ReturnType<typeof vi.fn>,
    fallbackMock: ReturnType<typeof vi.fn>,
    result: any
  ): void {
    expect(primaryMock).toHaveBeenCalled();
    expect(fallbackMock).toHaveBeenCalled();
    expect(result).toBeDefined();
  },

  /**
   * Validates error logging behavior
   */
  expectErrorLogging(loggerSpy: ReturnType<typeof vi.fn>, errorMessage: string): void {
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("error"),
      expect.objectContaining({
        error: expect.stringContaining(errorMessage),
      })
    );
  },

  /**
   * Creates comprehensive error test scenarios for batch operations
   */
  createBatchErrorScenarios() {
    return [
      {
        name: "Partial batch failure",
        setup: (fetcherSpy: ReturnType<typeof vi.fn>) => {
          fetcherSpy.mockImplementationOnce(() => {
            throw this.ERROR_SCENARIOS.RATE_LIMITED.error();
          });
          fetcherSpy.mockImplementationOnce(() =>
            Promise.resolve({ status: 200, json: () => Promise.resolve({}) })
          );
        },
        expectation: "Should handle partial failures gracefully",
      },
      {
        name: "Complete batch failure",
        setup: (fetcherSpy: ReturnType<typeof vi.fn>) => {
          fetcherSpy.mockImplementation(() => {
            throw this.ERROR_SCENARIOS.NETWORK_ERROR.error();
          });
        },
        expectation: "Should fail gracefully with proper error reporting",
      },
      {
        name: "Authentication failure with recovery",
        setup: (fetcherSpy: ReturnType<typeof vi.fn>) => {
          fetcherSpy
            .mockImplementationOnce(() => {
              throw this.ERROR_SCENARIOS.AUTH_ERROR.error();
            })
            .mockImplementationOnce(() => Promise.resolve({ status: 200, json: () => Promise.resolve({}) }));
        },
        expectation: "Should retry after token refresh",
      },
    ];
  },
};
