import { mockCalendarToHaveNoBusySlots, mockSuccessfulVideoMeetingCreation } from "./bookingScenario";

export const createStandardCalendarMock = (overrides?: {
  metadataLookupKey?: "googlecalendar" | "office365calendar" | "applecalendar" | "caldavcalendar";
  calendarData?: Record<string, unknown>;
}) => {
  return mockCalendarToHaveNoBusySlots(overrides?.metadataLookupKey || "googlecalendar", {
    create: {
      id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
      iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
    },
    update: {
      uid: "UPDATED_MOCK_ID",
    },
    ...overrides?.calendarData,
  });
};

export const createStandardVideoMock = (overrides?: {
  metadataLookupKey?: "dailyvideo" | "googlevideo" | "zoomvideo" | "jitsivideo";
  videoMeetingData?: Record<string, unknown>;
}) => {
  return mockSuccessfulVideoMeetingCreation({
    metadataLookupKey: overrides?.metadataLookupKey || "dailyvideo",
    videoMeetingData: {
      id: "MOCK_ID",
      password: "MOCK_PASS",
      url: "http://mock-dailyvideo.example.com/meeting-1",
      ...overrides?.videoMeetingData,
    },
  });
};

export const createBookingMocks = (_scenario: "fresh" | "reschedule" | "team" = "fresh") => {
  const calendarMock = createStandardCalendarMock();
  const videoMock = createStandardVideoMock();

  return {
    calendar: calendarMock,
    video: videoMock,
    cleanup: () => {
      return;
    },
  };
};

export const createMockRequestData = (
  scenario: "fresh" | "reschedule" | "team",
  overrides?: Record<string, unknown>
) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split("T")[0];

  const baseData = {
    eventTypeId: 1,
    start: `${dateString}T04:00:00.000Z`,
    end: `${dateString}T04:30:00.000Z`,
    responses: {
      email: "booker@example.com",
      name: "Booker",
      location: { optionValue: "" as const, value: "Cal Video" },
    },
    ...overrides,
  };

  if (scenario === "reschedule") {
    return {
      ...baseData,
      rescheduleUid: (overrides?.rescheduleUid as string) || "existing-booking-uid",
    };
  }

  return baseData;
};
