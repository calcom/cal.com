import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { ErrorWithCode } from "@calcom/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConnectedCalendars } from "../lib/CalendarManager";
import { DestinationCalendarService } from "./DestinationCalendarService";

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
}));

vi.mock("../lib/CalendarManager", () => ({
  getConnectedCalendars: vi.fn(),
  getCalendarCredentials: vi.fn().mockImplementation((creds) => creds),
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockReturnValue(null),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

function createMockRepository() {
  return {
    upsert: vi.fn().mockResolvedValue({}),
    getCustomReminderByCredentialId: vi.fn(),
    updateCustomReminder: vi.fn(),
  };
}

function createMockEventTypeRepository() {
  return {
    findByIdWithUserAccess: vi.fn(),
  };
}

function createMockConnectedCalendars({
  calendars,
}: {
  calendars: Array<{
    externalId: string;
    integration: string;
    readOnly: boolean;
    primary?: boolean | null;
    email: string;
    credentialId?: number | null;
    delegationCredentialId?: number | null;
  }>;
}) {
  return {
    connectedCalendars: [{ calendars }],
  };
}

describe("DestinationCalendarService", () => {
  let service: DestinationCalendarService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockEventTypeRepo: ReturnType<typeof createMockEventTypeRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    mockEventTypeRepo = createMockEventTypeRepository();
    service = new DestinationCalendarService({
      destinationCalendarRepository: mockRepo as any,
      eventTypeRepository: mockEventTypeRepo as any,
    });
  });

  it("should set destination calendar with delegation credentials", async () => {
    const delegationCredentialId = 123;
    const testExternalId = "TEST@group.calendar.google.com";
    const organizerEmail = "organizer@example.com";
    const organizerId = 101;

    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([
      { id: -1, delegationCredentialId, type: "google_calendar", key: {} },
    ]);

    vi.mocked(getConnectedCalendars).mockResolvedValue(
      createMockConnectedCalendars({
        calendars: [
          {
            externalId: organizerEmail,
            integration: "google_calendar",
            readOnly: false,
            primary: true,
            email: organizerEmail,
            credentialId: -1,
            delegationCredentialId,
          },
          {
            externalId: testExternalId,
            integration: "google_calendar",
            readOnly: false,
            primary: null,
            email: organizerEmail,
            credentialId: -1,
            delegationCredentialId,
          },
        ],
      })
    );

    await service.setDestinationCalendar({
      userId: organizerId,
      userEmail: organizerEmail,
      userLevelSelectedCalendars: [],
      integration: "google_calendar",
      externalId: testExternalId,
    });

    expect(mockRepo.upsert).toHaveBeenCalledWith({
      where: { userId: organizerId },
      update: {
        integration: "google_calendar",
        externalId: testExternalId,
        primaryEmail: organizerEmail,
        credentialId: -1,
        delegationCredentialId,
      },
      create: {
        userId: organizerId,
        integration: "google_calendar",
        externalId: testExternalId,
        primaryEmail: organizerEmail,
        credentialId: -1,
        delegationCredentialId,
      },
    });
  });

  it("should set destination calendar for a specific event type", async () => {
    const organizerEmail = "organizer@example.com";
    const credentialId = 5;
    const eventTypeId = 42;

    mockEventTypeRepo.findByIdWithUserAccess.mockResolvedValue({ id: eventTypeId });

    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([
      { id: credentialId, type: "google_calendar", key: {} },
    ]);

    vi.mocked(getConnectedCalendars).mockResolvedValue(
      createMockConnectedCalendars({
        calendars: [
          {
            externalId: "cal@google.com",
            integration: "google_calendar",
            readOnly: false,
            primary: true,
            email: organizerEmail,
            credentialId,
            delegationCredentialId: null,
          },
        ],
      })
    );

    await service.setDestinationCalendar({
      userId: 1,
      userEmail: organizerEmail,
      userLevelSelectedCalendars: [],
      integration: "google_calendar",
      externalId: "cal@google.com",
      eventTypeId,
    });

    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventTypeId },
        create: expect.objectContaining({ eventTypeId }),
      })
    );
  });

  it("should throw ErrorWithCode when calendar is not found", async () => {
    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
    vi.mocked(getConnectedCalendars).mockResolvedValue({ connectedCalendars: [] });

    await expect(
      service.setDestinationCalendar({
        userId: 1,
        userEmail: "test@example.com",
        userLevelSelectedCalendars: [],
        integration: "google_calendar",
        externalId: "non-existent",
      })
    ).rejects.toThrow(ErrorWithCode);
  });

  it("should prefer delegation credential calendar over regular credential", async () => {
    const organizerEmail = "organizer@example.com";
    const regularCredentialId = 1;
    const delegationCredentialId = 999;

    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([
      { id: regularCredentialId, type: "google_calendar", key: {} },
      { id: -1, delegationCredentialId, type: "google_calendar", key: {} },
    ]);

    vi.mocked(getConnectedCalendars).mockResolvedValue(
      createMockConnectedCalendars({
        calendars: [
          {
            externalId: "cal@google.com",
            integration: "google_calendar",
            readOnly: false,
            primary: true,
            email: organizerEmail,
            credentialId: regularCredentialId,
            delegationCredentialId: null,
          },
          {
            externalId: "cal@google.com",
            integration: "google_calendar",
            readOnly: false,
            primary: true,
            email: organizerEmail,
            credentialId: -1,
            delegationCredentialId,
          },
        ],
      })
    );

    await service.setDestinationCalendar({
      userId: 1,
      userEmail: organizerEmail,
      userLevelSelectedCalendars: [],
      integration: "google_calendar",
      externalId: "cal@google.com",
    });

    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          delegationCredentialId,
          credentialId: -1,
        }),
      })
    );
  });
});
