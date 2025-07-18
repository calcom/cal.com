import { describe, expect } from "vitest";

import { test } from "@calcom/web/test/fixtures/fixtures";

import { setupAndTeardown } from "../setupAndTeardown";
import { setupFreshBookingTest, expectStandardBookingSuccess } from "../testHelpers";

const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking - Refactored Examples", () => {
  setupAndTeardown();

  describe("Fresh Booking (Refactored)", () => {
    test(
      "should create a successful booking with minimal setup",
      async ({ emails }) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

        const { mockRequestData, organizer, booker } = await setupFreshBookingTest({
          withWebhooks: true,
          withWorkflows: true,
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockRequestData,
        });

        await expectStandardBookingSuccess({
          createdBooking,
          mockRequestData,
          organizer,
          booker,
          emails,
          withWebhook: true,
        });
      },
      timeout
    );

    test(
      "should create booking with custom organizer",
      async ({ emails }) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

        const { mockRequestData, organizer, booker } = await setupFreshBookingTest({
          organizer: {
            name: "Custom Organizer",
            email: "custom@example.com",
            id: 999,
          },
          booker: {
            name: "Custom Booker",
            email: "custom-booker@example.com",
          },
          eventType: {
            users: [{ id: 999 }],
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockRequestData,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: "custom-booker@example.com",
            name: "Custom Booker",
          })
        );

        await expectStandardBookingSuccess({
          createdBooking,
          mockRequestData,
          organizer,
          booker,
          emails,
        });
      },
      timeout
    );
  });
});
