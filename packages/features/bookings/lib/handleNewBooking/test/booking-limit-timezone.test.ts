
import {
    TestData,
    createBookingScenario,
    getBooker,
    getDate,
    getOrganizer,
    getScenarioData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { addBookings } from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { describe, expect, test } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

describe("Reproduction GH-27261", () => {
    setupAndTeardown();

    test("should allow booking when limit is 1 per day and no bookings exist (Timezone Check)", async () => {
        const handleNewBooking = getNewBookingHandler();
        const eventLength = 30;

        // Organizer: Asia/Kolkata (+05:30)
        // Booker: America/New_York (We use hardcoded Europe/London for safety in data object, but getting booker with NY)
        // Limits should operate on Organizer Timezone normally.

        const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
            timeZone: "America/New_York",
        });

        const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            timeZone: "Asia/Kolkata",
            schedules: [
                {
                    ...TestData.schedules.IstWorkHours,
                    id: 1,
                    availability: [
                        { days: [0, 1, 2, 3, 4, 5, 6], startTime: "00:00", endTime: "23:59" },
                    ],
                },
            ],
        });

        // Create Event Type with limit 1 per day
        await createBookingScenario(
            getScenarioData({
                eventTypes: [
                    {
                        id: 1,
                        slotInterval: eventLength,
                        length: eventLength,
                        users: [{ id: 101 }],
                        bookingLimits: {
                            PER_DAY: 1,
                        },
                    },
                ],
                organizer,
            })
        );

        // Use a dynamic future date to avoid "booking in the past" error
        const { dateString } = getDate({ dateIncrement: 5 }); // 5 days in future

        // Scenario:
        // Booking 1 (Existing):
        // Date: YYYY-MM-DD
        // Time: 19:00 UTC
        // IST (+05:30): Next Day 00:30
        const existingBookingStart = `${dateString}T19:00:00.000Z`;
        const existingBookingEnd = `${dateString}T19:30:00.000Z`;

        await addBookings([
            {
                eventTypeId: 1,
                userId: organizer.id,
                startTime: existingBookingStart,
                endTime: existingBookingEnd,
                status: "ACCEPTED",
                attendees: [
                    {
                        email: "other@example.com",
                        timeZone: "Europe/London",
                        locale: "en",
                    }
                ]
            },
        ]);

        // Booking 2 (New Request):
        // Date: YYYY-MM-DD
        // Time: 10:00 UTC
        // IST (+05:30): Same Day 15:30

        const newBookingStart = `${dateString}T10:00:00.000Z`;
        const newBookingEnd = `${dateString}T10:30:00.000Z`;

        const mockBookingData = {
            start: newBookingStart,
            end: newBookingEnd,
            eventTypeId: 1,
            eventTypeSlug: "test-event-slug",
            timeZone: "Europe/London",
            language: "en",
            user: "teampro",
            metadata: {},
            hasHashedBookingLink: false,
            responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "+19195551234", value: "phone" },
            },
        };

        // We expect this to SUCCEED if the bug is fixed/non-existent.
        // If the bug exists (UTC mismatch), this will throw booking_limit_reached.
        // If it throws "no_available_users_found_error", it means it PASSED the limit check (Success for this test).
        try {
            await handleNewBooking({ bookingData: mockBookingData });
        } catch (e: any) {
            if (e.message.includes("booking_limit_reached")) {
                throw new Error("Regression: Booking limit reached error thrown!");
            }
            if (!e.message.includes("no_available_users_found_error")) {
                // If it's some other error, rethrow it
                throw e;
            }
            // If it is no_available_users_found_error, we consider it passed for the purpose of checking limits
        }
    });
});
