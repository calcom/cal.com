import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import { getTokenObjectFromCredential } from "../../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "../../lib/CalendarService";
import { Office365SubscriptionManager } from "../../lib/Office365SubscriptionManager";
import { getOfficeAppKeys } from "../../lib/getOfficeAppKeys";
import { defaultFetcherMockImplementation } from "../mock_utils/mocks";
import { createCredentialForCalendarService, createMultipleSelectedCalendars } from "../mock_utils/utils";
import { ErrorHandlingTestUtils } from "./shared/error-handling.utils";

// Mock dependencies
vi.mock("../../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("../../lib/getOfficeAppKeys");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTokenObjectFromCredential).mockReturnValue({
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_at: new Date(Date.now() + 3600 * 1000),
  });
  vi.mocked(getOfficeAppKeys).mockResolvedValue({
    client_id: "mock_client_id",
    client_secret: "mock_client_secret",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Office365SubscriptionManager - Subscription Management", () => {
  describe("Subscription Creation", () => {
    test("should create subscription for calendar optimization", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions")) {
            return {
              status: 201,
              ok: true,
              statusText: "Created",
              json: async () => ({
                id: "subscription-123",
                resource: "calendars/calendar123/events",
                changeType: "updated",
                notificationUrl: "https://example.com/webhook",
                expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const result = await subscriptionManager.createSubscription("calendar123");

      expect(result).toBeDefined();
      expect(result.id).toBe("subscription-123");
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions"),
        expect.objectContaining({ method: "POST" })
      );

      fetcherSpy.mockRestore();
    });

    test("should handle subscription creation failures", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const subscriptionError = ErrorHandlingTestUtils.ERROR_SCENARIOS.SUBSCRIPTION_ERROR;
      const fetcherSpy = vi.fn().mockImplementation(async (endpoint, options) => {
        // Mock the /me endpoint to succeed so getUserEndpoint doesn't fail
        if (endpoint === "/me") {
          return {
            status: 200,
            ok: true,
            statusText: "OK",
            headers: new Headers({ "Content-Type": "application/json" }),
            json: async () => ({
              userPrincipalName: "test@example.com",
              id: "test-user-id",
            }),
          };
        }
        // Mock the subscription creation to fail
        if (endpoint === "/subscriptions" && options?.method === "POST") {
          return ErrorHandlingTestUtils.createErrorMock(subscriptionError)();
        }
        return defaultFetcherMockImplementation(endpoint, options);
      });

      vi.spyOn(calendarService, "fetcher" as any).mockImplementation(fetcherSpy);

      await expect(subscriptionManager.createSubscription("calendar123")).rejects.toThrow(
        /Failed to create subscription: 500 Internal Server Error - /
      );

      // Verify the /me endpoint was called first
      expect(fetcherSpy).toHaveBeenCalledWith("/me");
      // Verify the subscription endpoint was called second
      expect(fetcherSpy).toHaveBeenCalledWith("/subscriptions", expect.objectContaining({ method: "POST" }));

      fetcherSpy.mockRestore();
    });

    test("should create subscriptions for multiple calendars", async () => {
      const credential = await createCredentialForCalendarService();
      const calendars = await createMultipleSelectedCalendars(credential.userId!, credential.id, 3);
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (
            typeof endpoint === "string" &&
            endpoint.includes("/subscriptions") &&
            (options as any)?.method === "POST"
          ) {
            // Extract calendar ID from the request body
            let calendarId = "unknown";
            if ((options as any)?.body) {
              try {
                const body = JSON.parse((options as any).body);
                const resourceMatch = body.resource?.match(/calendars\/([^\/]+)\/events/);
                calendarId = resourceMatch ? resourceMatch[1] : "unknown";
              } catch (e) {
                // Fallback to unknown if parsing fails
              }
            }

            return {
              status: 201,
              ok: true,
              statusText: "Created",
              json: async () => ({
                id: `subscription-${calendarId}`,
                resource: `calendars/${calendarId}/events`,
                changeType: "updated",
                notificationUrl: "https://example.com/webhook",
                expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const results = await Promise.all(
        calendars.map((calendar) => subscriptionManager.createSubscription(calendar.externalId))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.id).toBe(`subscription-${calendars[index].externalId}`);
      });

      fetcherSpy.mockRestore();
    });
  });

  describe("Subscription Renewal", () => {
    test("should renew expiring subscriptions", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions/subscription-123")) {
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              json: async () => ({
                id: "subscription-123",
                resource: "calendars/calendar123/events",
                changeType: "updated",
                notificationUrl: "https://example.com/webhook",
                expirationDateTime: new Date(Date.now() + 7200 * 1000).toISOString(), // Extended by 2 hours
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const result = await subscriptionManager.renewSubscription("subscription-123");

      expect(result).toBeDefined();
      expect(result.id).toBe("subscription-123");
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions/subscription-123"),
        expect.objectContaining({ method: "PATCH" })
      );

      fetcherSpy.mockRestore();
    });

    test("should handle subscription renewal failures", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const renewalError = ErrorHandlingTestUtils.ERROR_SCENARIOS.SUBSCRIPTION_ERROR;
      const fetcherSpy = ErrorHandlingTestUtils.createErrorMock(renewalError);

      vi.spyOn(calendarService, "fetcher" as any).mockImplementation(fetcherSpy);

      await expect(subscriptionManager.renewSubscription("subscription-123")).rejects.toThrow(
        "Failed to renew subscription: 500 Internal Server Error"
      );

      ErrorHandlingTestUtils.expectErrorHandling(fetcherSpy, renewalError, 1);

      fetcherSpy.mockRestore();
    });

    test("should batch renew multiple subscriptions", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const subscriptionIds = ["subscription-1", "subscription-2", "subscription-3"];

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions/")) {
            const subscriptionId = endpoint.split("/").pop();
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              json: async () => ({
                id: subscriptionId,
                resource: `calendars/calendar${subscriptionId}/events`,
                changeType: "updated",
                notificationUrl: "https://example.com/webhook",
                expirationDateTime: new Date(Date.now() + 7200 * 1000).toISOString(),
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const results = await Promise.all(
        subscriptionIds.map((id) => subscriptionManager.renewSubscription(id))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.id).toBe(subscriptionIds[index]);
      });

      fetcherSpy.mockRestore();
    });
  });

  describe("Subscription Deletion", () => {
    test("should delete subscription successfully", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions/subscription-123")) {
            return {
              status: 204,
              ok: true,
              statusText: "No Content",
              json: async () => ({}),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const result = await subscriptionManager.deleteSubscription("subscription-123");

      expect(result).toBe(true);
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringContaining("/subscriptions/subscription-123"),
        expect.objectContaining({ method: "DELETE" })
      );

      fetcherSpy.mockRestore();
    });

    test("should handle subscription deletion failures", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const deletionError = ErrorHandlingTestUtils.ERROR_SCENARIOS.SUBSCRIPTION_ERROR;
      const fetcherSpy = ErrorHandlingTestUtils.createErrorMock(deletionError);

      vi.spyOn(calendarService, "fetcher" as any).mockImplementation(fetcherSpy);

      await expect(subscriptionManager.deleteSubscription("subscription-123")).rejects.toThrow(
        "Failed to delete subscription: 500 Internal Server Error"
      );

      ErrorHandlingTestUtils.expectErrorHandling(fetcherSpy, deletionError, 1);

      fetcherSpy.mockRestore();
    });

    test("should delete multiple subscriptions", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const subscriptionIds = ["subscription-1", "subscription-2", "subscription-3"];

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions/")) {
            return {
              status: 204,
              ok: true,
              statusText: "No Content",
              json: async () => ({}),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const results = await Promise.all(
        subscriptionIds.map((id) => subscriptionManager.deleteSubscription(id))
      );

      expect(results).toEqual([true, true, true]);
      expect(fetcherSpy).toHaveBeenCalledTimes(3);

      fetcherSpy.mockRestore();
    });
  });

  describe("Subscription Listing", () => {
    test("should list all subscriptions", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions")) {
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              json: async () => ({
                value: [
                  {
                    id: "subscription-1",
                    resource: "calendars/calendar1/events",
                    changeType: "updated",
                    notificationUrl: "https://example.com/webhook",
                    expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                  {
                    id: "subscription-2",
                    resource: "calendars/calendar2/events",
                    changeType: "updated",
                    notificationUrl: "https://example.com/webhook",
                    expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const result = await subscriptionManager.getSubscriptionsForCredential();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("subscription-1");
      expect(result[1].id).toBe("subscription-2");

      fetcherSpy.mockRestore();
    });

    test("should handle empty subscription list", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions")) {
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              json: async () => ({
                value: [],
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const result = await subscriptionManager.getSubscriptionsForCredential();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);

      fetcherSpy.mockRestore();
    });
  });

  describe("Subscription Validation", () => {
    test("should identify subscriptions needing renewal", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const soonToExpire = new Date(Date.now() + 300 * 1000); // 5 minutes from now

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions")) {
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              json: async () => ({
                value: [
                  {
                    id: "subscription-1",
                    resource: "calendars/calendar1/events",
                    changeType: "updated",
                    notificationUrl: "https://example.com/webhook",
                    expirationDateTime: soonToExpire.toISOString(),
                  },
                  {
                    id: "subscription-2",
                    resource: "calendars/calendar2/events",
                    changeType: "updated",
                    notificationUrl: "https://example.com/webhook",
                    expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
                  },
                ],
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const subscriptions = await subscriptionManager.getSubscriptionsForCredential();
      const renewalThreshold = 15 * 60 * 1000; // 15 minutes

      const needsRenewal = subscriptions.filter((sub: any) => {
        const expirationTime = new Date(sub.expirationDateTime).getTime();
        const currentTime = Date.now();
        return expirationTime - currentTime < renewalThreshold;
      });

      expect(needsRenewal).toHaveLength(1);
      expect(needsRenewal[0].id).toBe("subscription-1");

      fetcherSpy.mockRestore();
    });
  });

  describe("Subscription Error Recovery", () => {
    test("should handle subscription not found errors", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/subscriptions/non-existent")) {
            return {
              status: 404,
              ok: false,
              statusText: "Not Found",
              headers: new Headers({ "Content-Type": "application/json" }),
              json: async () => ({
                error: {
                  code: "NotFound",
                  message: "Subscription not found",
                },
              }),
              text: async () =>
                JSON.stringify({
                  error: {
                    code: "NotFound",
                    message: "Subscription not found",
                  },
                }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      // Since getSubscription method doesn't exist, we'll test with renewSubscription instead
      await expect(subscriptionManager.renewSubscription("non-existent")).rejects.toThrow();

      fetcherSpy.mockRestore();
    });

    test("should fail on transient failures without retry", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      // Mock a 429 response that should cause the operation to fail
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          // Mock the /me endpoint to succeed so getUserEndpoint doesn't fail
          if (endpoint === "/me") {
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              headers: new Headers({ "Content-Type": "application/json" }),
              json: async () => ({
                userPrincipalName: "test@example.com",
                id: "test-user-id",
              }),
            };
          }
          // Mock the subscription creation to fail with rate limit
          if (endpoint === "/subscriptions" && (options as any)?.method === "POST") {
            return {
              status: 429,
              ok: false,
              statusText: "Too Many Requests",
              headers: new Headers({ "Content-Type": "application/json", "Retry-After": "60" }),
              json: async () => ({
                error: {
                  code: "TooManyRequests",
                  message: "Rate limit exceeded",
                },
              }),
              text: async () =>
                JSON.stringify({
                  error: {
                    code: "TooManyRequests",
                    message: "Rate limit exceeded",
                  },
                }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      // Should fail with rate limit error since SubscriptionManager doesn't have retry logic
      await expect(subscriptionManager.createSubscription("calendar123")).rejects.toThrow(
        /Failed to create subscription: 429 Too Many Requests - /
      );

      expect(fetcherSpy).toHaveBeenCalledWith("/me");
      expect(fetcherSpy).toHaveBeenCalledWith("/subscriptions", expect.objectContaining({ method: "POST" }));

      fetcherSpy.mockRestore();
    });

    test("should handle authentication errors in subscription operations", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      // Mock a 401 response that should cause the operation to fail
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          // Mock the /me endpoint to succeed so getUserEndpoint doesn't fail
          if (endpoint === "/me") {
            return {
              status: 200,
              ok: true,
              statusText: "OK",
              headers: new Headers({ "Content-Type": "application/json" }),
              json: async () => ({
                userPrincipalName: "test@example.com",
                id: "test-user-id",
              }),
            };
          }
          // Mock the subscription creation to fail with auth error
          if (endpoint === "/subscriptions" && (options as any)?.method === "POST") {
            return {
              status: 401,
              ok: false,
              statusText: "Unauthorized",
              headers: new Headers({ "Content-Type": "application/json" }),
              json: async () => ({
                error: {
                  code: "InvalidAuthenticationToken",
                  message: "Authentication failed",
                },
              }),
              text: async () =>
                JSON.stringify({
                  error: {
                    code: "InvalidAuthenticationToken",
                    message: "Authentication failed",
                  },
                }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      // Should fail with auth error since SubscriptionManager doesn't have retry logic
      await expect(subscriptionManager.createSubscription("calendar123")).rejects.toThrow(
        /Failed to create subscription: 401 Unauthorized - /
      );

      expect(fetcherSpy).toHaveBeenCalledWith("/me");
      expect(fetcherSpy).toHaveBeenCalledWith("/subscriptions", expect.objectContaining({ method: "POST" }));

      fetcherSpy.mockRestore();
    });
  });

  describe("Subscription Lifecycle Management", () => {
    test("should manage complete subscription lifecycle", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const subscriptionManager = new Office365SubscriptionManager(calendarService);

      const subscriptionId = "subscription-lifecycle-test";

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint: any, options: any) => {
          if (typeof endpoint === "string") {
            if (endpoint.includes("/subscriptions") && options?.method === "POST") {
              // Create subscription
              return {
                status: 201,
                ok: true,
                statusText: "Created",
                json: async () => ({
                  id: subscriptionId,
                  resource: "calendars/calendar123/events",
                  changeType: "updated",
                  notificationUrl: "https://example.com/webhook",
                  expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(),
                }),
              };
            } else if (endpoint.includes(`/subscriptions/${subscriptionId}`) && options?.method === "PATCH") {
              // Renew subscription
              return {
                status: 200,
                ok: true,
                statusText: "OK",
                json: async () => ({
                  id: subscriptionId,
                  resource: "calendars/calendar123/events",
                  changeType: "updated",
                  notificationUrl: "https://example.com/webhook",
                  expirationDateTime: new Date(Date.now() + 7200 * 1000).toISOString(),
                }),
              };
            } else if (
              endpoint.includes(`/subscriptions/${subscriptionId}`) &&
              options?.method === "DELETE"
            ) {
              // Delete subscription
              return {
                status: 204,
                ok: true,
                statusText: "No Content",
                json: async () => ({}),
              };
            }
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      // 1. Create subscription
      const created = await subscriptionManager.createSubscription("calendar123");
      expect(created.id).toBe("subscription-lifecycle-test");

      // 2. Renew subscription
      const renewed = await subscriptionManager.renewSubscription(subscriptionId);
      expect(renewed.id).toBe(subscriptionId);

      // 3. Delete subscription
      const deleted = await subscriptionManager.deleteSubscription(subscriptionId);
      expect(deleted).toBe(true);

      fetcherSpy.mockRestore();
    });
  });
});
