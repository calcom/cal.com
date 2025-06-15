import dayjs from "@calcom/dayjs";

/**
 * Test date configuration for Office365 Calendar tests
 * Always uses current or next week dates to ensure tests work reliably
 * Focused on testing calendar optimization scenarios
 */

// Get current date and next week dates
const now = dayjs();
const nextWeek = now.add(1, "week");
const currentWeekStart = now.startOf("week");
const nextWeekStart = nextWeek.startOf("week");

export const TEST_DATES = {
  // Current week dates
  TODAY: now.format("YYYY-MM-DD"),
  TODAY_ISO: now.toISOString(),
  CURRENT_WEEK_START: currentWeekStart.format("YYYY-MM-DD"),
  CURRENT_WEEK_START_ISO: currentWeekStart.toISOString(),
  CURRENT_WEEK_END: currentWeekStart.add(6, "days").format("YYYY-MM-DD"),
  CURRENT_WEEK_END_ISO: currentWeekStart.add(6, "days").toISOString(),

  // Next week dates for future bookings
  NEXT_WEEK_START: nextWeekStart.format("YYYY-MM-DD"),
  NEXT_WEEK_START_ISO: nextWeekStart.toISOString(),
  NEXT_WEEK_END: nextWeekStart.add(6, "days").format("YYYY-MM-DD"),
  NEXT_WEEK_END_ISO: nextWeekStart.add(6, "days").toISOString(),

  // Specific day times for testing round-robin scenarios
  TOMORROW: now.add(1, "day").format("YYYY-MM-DD"),
  TOMORROW_9AM: now.add(1, "day").hour(9).minute(0).second(0).toISOString(),
  TOMORROW_10AM: now.add(1, "day").hour(10).minute(0).second(0).toISOString(),
  TOMORROW_2PM: now.add(1, "day").hour(14).minute(0).second(0).toISOString(),
  TOMORROW_3PM: now.add(1, "day").hour(15).minute(0).second(0).toISOString(),

  // Date ranges for availability testing
  AVAILABILITY_START: nextWeekStart.hour(0).minute(0).second(0).toISOString(),
  AVAILABILITY_END: nextWeekStart.hour(23).minute(59).second(59).toISOString(),

  // Extended ranges for chunking tests (optimization scenarios)
  EXTENDED_START: now.format("YYYY-MM-DD"),
  EXTENDED_END: now.add(120, "days").format("YYYY-MM-DD"), // ~4 months for chunking tests
  EXTENDED_START_ISO: now.toISOString(),
  EXTENDED_END_ISO: now.add(120, "days").toISOString(),
};

/**
 * Generate dynamic dates for specific test scenarios
 * Used for testing calendar optimization and round-robin scenarios
 */
export const generateTestDates = {
  /**
   * Get busy times for a specific day offset from today
   * Used for testing multiple calendar scenarios
   */
  getBusyTimesForDay: (dayOffset = 1) => {
    const targetDay = now.add(dayOffset, "day");
    return [
      {
        start: targetDay.hour(9).minute(0).second(0).toDate(),
        end: targetDay.hour(10).minute(0).second(0).toDate(),
      },
      {
        start: targetDay.hour(14).minute(0).second(0).toDate(),
        end: targetDay.hour(15).minute(30).second(0).toDate(),
      },
    ];
  },

  /**
   * Get a date range for availability checking
   * Used for testing optimization scenarios
   */
  getAvailabilityRange: (startDayOffset = 1, durationDays = 1) => {
    const startDate = now.add(startDayOffset, "day");
    const endDate = startDate.add(durationDays, "day");
    return {
      start: startDate.hour(0).minute(0).second(0).toISOString(),
      end: endDate.hour(23).minute(59).second(59).toISOString(),
    };
  },

  /**
   * Get dates for round-robin testing (multiple consecutive days)
   * Used for testing team event optimization
   */
  getRoundRobinDates: (numDays = 7) => {
    const dates = [];
    for (let i = 1; i <= numDays; i++) {
      const date = now.add(i, "day");
      dates.push({
        date: date.format("YYYY-MM-DD"),
        iso: date.toISOString(),
        startOfDay: date.hour(0).minute(0).second(0).toISOString(),
        endOfDay: date.hour(23).minute(59).second(59).toISOString(),
      });
    }
    return dates;
  },

  /**
   * Get team event booking scenarios with multiple members
   * Used for testing round-robin optimization
   */
  getTeamEventScenarios: (memberCount = 3, daysAhead = 7) => {
    const scenarios = [];
    for (let i = 1; i <= daysAhead; i++) {
      const date = now.add(i, "day");
      scenarios.push({
        date: date.format("YYYY-MM-DD"),
        members: Array.from({ length: memberCount }, (_, index) => ({
          id: index + 1,
          availableSlots: [
            date.hour(9).minute(0).toISOString(),
            date.hour(11).minute(0).toISOString(),
            date.hour(14).minute(0).toISOString(),
            date.hour(16).minute(0).toISOString(),
          ],
        })),
      });
    }
    return scenarios;
  },
};

/**
 * Mock data generators using dynamic dates
 * Focused on calendar optimization testing scenarios
 */
export const generateMockData = {
  /**
   * Generate mock busy times for testing
   */
  busyTimes: () => generateTestDates.getBusyTimesForDay(1),

  /**
   * Generate mock calendar events for a specific day
   */
  calendarEvents: (dayOffset = 1) => {
    const targetDay = now.add(dayOffset, "day");
    return [
      {
        id: `event-1-${targetDay.format("YYYY-MM-DD")}`,
        subject: "Team Meeting",
        start: { dateTime: targetDay.hour(9).minute(0).toISOString() },
        end: { dateTime: targetDay.hour(10).minute(0).toISOString() },
        showAs: "busy",
      },
      {
        id: `event-2-${targetDay.format("YYYY-MM-DD")}`,
        subject: "Client Call",
        start: { dateTime: targetDay.hour(14).minute(0).toISOString() },
        end: { dateTime: targetDay.hour(15).minute(30).toISOString() },
        showAs: "busy",
      },
    ];
  },

  /**
   * Generate mock subscription data for webhook testing
   */
  subscriptionData: (calendarId: string) => ({
    id: `subscription-${calendarId}`,
    resource: `/me/calendars('${calendarId}')/events`,
    changeType: "created,updated,deleted",
    notificationUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
    expirationDateTime: now.add(1, "day").toISOString(),
    clientState: process.env.MICROSOFT_WEBHOOK_TOKEN || "test-webhook-token",
  }),

  /**
   * Generate multiple calendar scenarios for optimization testing
   */
  multipleCalendarScenarios: (calendarCount = 5) => {
    const calendars = [];
    for (let i = 1; i <= calendarCount; i++) {
      calendars.push({
        externalId: `calendar-${i}`,
        integration: "office365_calendar",
        name: `Test Calendar ${i}`,
        primary: i === 1,
        readOnly: false,
        email: `user${i}@example.com`,
        busyTimes: generateTestDates.getBusyTimesForDay(i),
      });
    }
    return calendars;
  },
};

/**
 * Cache-related date utilities for testing optimization
 */
export const cacheTestDates = {
  FUTURE_EXPIRATION_DATE: new Date(Date.now() + 100000000),

  getDatePair: () => {
    const dateFrom = TEST_DATES.NEXT_WEEK_START_ISO;
    const dateTo = TEST_DATES.NEXT_WEEK_END_ISO;
    return {
      dateFrom,
      dateTo,
      minDateFrom: dateFrom,
      maxDateTo: dateTo,
    };
  },

  getCacheKeyForCalendars: (calendarIds: string[]) => {
    const { dateFrom, dateTo } = cacheTestDates.getDatePair();
    return JSON.stringify({
      timeMin: dateFrom,
      timeMax: dateTo,
      items: calendarIds.map((id) => ({ id })),
    });
  },
};
