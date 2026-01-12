/**
 * @vitest-environment jsdom
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { BookerEvent } from "@calcom/features/bookings/types";

import { useInitialFormValues } from "./useInitialFormValues";

vi.mock("@calcom/features/bookings/Booker/store", () => ({
  useBookerStore: vi.fn((selector) => {
    const state = {
      bookingData: null,
      formValues: {},
    };
    return selector(state);
  }),
}));

vi.mock("@calcom/features/bookings/lib/getBookingResponsesSchema", () => ({
  getBookingResponsesPartialSchema: vi.fn(() => ({
    parseAsync: vi.fn((data) => Promise.resolve(data)),
  })),
}));

describe("useInitialFormValues - Autofill Disable Feature", () => {
  const mockBookingFields = [
    { name: "name", type: "text" as const, required: true },
    { name: "email", type: "email" as const, required: true },
    { name: "phone", type: "phone" as const, required: false },
  ] as unknown as BookerEvent["bookingFields"];

  const baseProps = {
    rescheduleUid: null,
    isRescheduling: false,
    email: null,
    name: null,
    username: null,
    hasSession: false,
    extraOptions: {},
    prefillFormParams: {
      guests: [],
      name: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("when organization has NOT disabled autofill", () => {
    it("should use URL parameters to prefill form fields", async () => {
      const eventType: Pick<BookerEvent, "bookingFields" | "team" | "owner"> = {
        bookingFields: mockBookingFields,
        team: {
          organizationSettings: {
            disableAutofillOnBookingPage: false,
          },
        },
        owner: null,
      };

      const extraOptions = {
        phone: "+1234567890",
        customField: "custom value",
      };

      const prefillFormParams = {
        guests: ["guest1@example.com", "guest2@example.com"],
        name: "John Doe",
      };

      const { result } = renderHook(() =>
        useInitialFormValues({
          ...baseProps,
          eventType,
          extraOptions,
          prefillFormParams,
        })
      );

      await waitFor(() => {
        expect(result.current.values.responses).toBeDefined();
      });

      expect(result.current.values.responses).toMatchObject({
        name: "John Doe",
        phone: "+1234567890",
      });
    });

    it("should use URL parameters when organizationSettings is undefined", async () => {
      const eventType: Pick<BookerEvent, "bookingFields" | "team" | "owner"> = {
        bookingFields: mockBookingFields,
        team: null,
        owner: null,
      };

      const extraOptions = {
        phone: "+1234567890",
      };

      const prefillFormParams = {
        guests: [],
        name: "Jane Smith",
      };

      const { result } = renderHook(() =>
        useInitialFormValues({
          ...baseProps,
          eventType,
          extraOptions,
          prefillFormParams,
        })
      );

      await waitFor(() => {
        expect(result.current.values.responses).toBeDefined();
      });

      expect(result.current.values.responses).toMatchObject({
        name: "Jane Smith",
        phone: "+1234567890",
      });
    });
  });

  describe("when organization HAS disabled autofill", () => {
    it("should NOT use URL parameters when team.organizationSettings.disableAutofillOnBookingPage is true", async () => {
      const eventType: Pick<BookerEvent, "bookingFields" | "team" | "owner"> = {
        bookingFields: mockBookingFields,
        team: {
          parent: {
            organizationSettings: {
              disableAutofillOnBookingPage: true,
            },
          },
        },
        owner: null,
      };

      const extraOptions = {
        phone: "+1234567890",
        customField: "custom value",
      };

      const prefillFormParams = {
        guests: ["guest1@example.com"],
        name: "John Doe",
      };

      const { result } = renderHook(() =>
        useInitialFormValues({
          ...baseProps,
          eventType,
          extraOptions,
          prefillFormParams,
        })
      );

      await waitFor(() => {
        expect(result.current.values.responses).toBeDefined();
      });

      expect(result.current.values.responses?.phone).toBeUndefined();
      expect(result.current.values.responses?.name).toBe("");
    });

    it("should NOT use URL parameters when team.parent.organizationSettings.disableAutofillOnBookingPage is true", async () => {
      const eventType: Pick<BookerEvent, "bookingFields" | "team" | "owner"> = {
        bookingFields: mockBookingFields,
        team: {
          organizationSettings: null,
          parent: {
            organizationSettings: {
              disableAutofillOnBookingPage: true,
            },
          },
        },
        owner: null,
      };

      const extraOptions = {
        phone: "+9876543210",
      };

      const prefillFormParams = {
        guests: [],
        name: "Parent Team User",
      };

      const { result } = renderHook(() =>
        useInitialFormValues({
          ...baseProps,
          eventType,
          extraOptions,
          prefillFormParams,
        })
      );

      await waitFor(() => {
        expect(result.current.values.responses).toBeDefined();
      });

      expect(result.current.values.responses?.phone).toBeUndefined();
      expect(result.current.values.responses?.name).toBe("");
    });

    it("should NOT use URL parameters when owner.organization.organizationSettings.disableAutofillOnBookingPage is true", async () => {
      const eventType: Pick<BookerEvent, "bookingFields" | "team" | "owner"> = {
        bookingFields: mockBookingFields,
        team: null,
        owner: {
          profile: {
            organization: {
              organizationSettings: {
                disableAutofillOnBookingPage: true,
              },
            },
          },
        },
      };

      const extraOptions = {
        phone: "+5555555555",
      };

      const prefillFormParams = {
        guests: [],
        name: "Personal Event User",
      };

      const { result } = renderHook(() =>
        useInitialFormValues({
          ...baseProps,
          eventType,
          extraOptions,
          prefillFormParams,
        })
      );

      await waitFor(() => {
        expect(result.current.values.responses).toBeDefined();
      });

      expect(result.current.values.responses?.phone).toBeUndefined();
      expect(result.current.values.responses?.name).toBe("");
    });
  });

  describe("session data handling with autofill disabled", () => {
    it("should not use session email/name when autofill is disabled", async () => {
      const eventType: Pick<BookerEvent, "bookingFields" | "team" | "owner"> = {
        bookingFields: mockBookingFields,
        team: {
          parent: {
            organizationSettings: {
              disableAutofillOnBookingPage: true,
            },
          },
        },
        owner: null,
      };

      const extraOptions = {
        phone: "+1234567890", // This should be blocked
      };

      const { result } = renderHook(() =>
        useInitialFormValues({
          ...baseProps,
          eventType,
          extraOptions,
          email: "session@example.com", // Session data
          name: "Session User", // Session data
          hasSession: true,
        })
      );

      await waitFor(() => {
        expect(result.current.values.responses).toBeDefined();
      });

      expect(result.current.values.responses?.email).toBe("");
      expect(result.current.values.responses?.name).toBe("");
      expect(result.current.values.responses?.phone).toBeUndefined();
    });
  });
});
