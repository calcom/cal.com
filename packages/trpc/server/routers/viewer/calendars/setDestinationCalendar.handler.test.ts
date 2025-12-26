import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";

import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { getConnectedCalendars } from "@calcom/features/calendars/lib/CalendarManager";
import { DestinationCalendarRepository } from "@calcom/features/calendars/repositories/DestinationCalendarRepository";

import { TRPCError } from "@trpc/server";

import { setDestinationCalendarHandler } from "./setDestinationCalendar.handler";

type MockUser = {
  id: number;
  email: string;
  userLevelSelectedCalendars: Array<{
    integration: string;
    externalId: string;
    credentialId: number | null;
    delegationCredentialId?: number | null;
  }>;
};

vi.mock("@calcom/features/calendars/lib/CalendarManager", () => ({
  getConnectedCalendars: vi.fn(),
  getCalendarCredentials: vi.fn().mockImplementation((creds) => creds),
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
}));

vi.mock("@calcom/features/calendars/repositories/DestinationCalendarRepository", () => ({
  DestinationCalendarRepository: {
    upsert: vi.fn(),
  },
}));

// Mock data helpers
function createMockUser({
  id,
  email,
  userLevelSelectedCalendars = [],
}: {
  id: number;
  email: string;
  userLevelSelectedCalendars?: Array<{
    integration: string;
    externalId: string;
    credentialId: number | null;
    delegationCredentialId?: number | null;
  }>;
}): MockUser {
  return {
    id,
    email,
    userLevelSelectedCalendars,
  };
}

function createMockCredential({
  id,
  delegationCredentialId,
}: {
  id: number;
  delegationCredentialId?: number;
}) {
  return {
    id,
    delegationCredentialId,
    type: "google_calendar",
    key: {},
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
    connectedCalendars: [
      {
        calendars,
      },
    ],
  };
}

describe("setDestinationCalendarHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should successfully set destination calendar with DelegationCredential credentials", async () => {
    const delegationCredentialId = 123;
    const testExternalId = "TEST@group.calendar.google.com";
    const organizerEmail = "organizer@example.com";
    const organizerId = 101;

    // Create mock user
    const mockUser = createMockUser({
      id: organizerId,
      email: organizerEmail,
      userLevelSelectedCalendars: [
        {
          integration: "google_calendar",
          externalId: testExternalId,
          credentialId: null,
          delegationCredentialId: delegationCredentialId,
        },
      ],
    });

    // Mock credentials
    const mockCredentials = [
      createMockCredential({
        id: -1,
        delegationCredentialId,
      }),
    ];

    // Mock connected calendars response
    const mockConnectedCalendars = createMockConnectedCalendars({
      calendars: [
        {
          externalId: organizerEmail,
          integration: "google_calendar",
          readOnly: false,
          primary: true,
          email: organizerEmail,
          credentialId: -1,
          delegationCredentialId: delegationCredentialId,
        },
        {
          externalId: testExternalId,
          integration: "google_calendar",
          readOnly: false,
          primary: null,
          email: organizerEmail,
          credentialId: -1,
          delegationCredentialId: delegationCredentialId,
        },
      ],
    });

    // Setup mocks
    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue(mockCredentials);
    vi.mocked(getConnectedCalendars).mockResolvedValue(mockConnectedCalendars);
    vi.mocked(DestinationCalendarRepository.upsert).mockResolvedValue({});

    const ctx = {
      user: mockUser,
    };

    await setDestinationCalendarHandler({
      ctx,
      input: {
        integration: "google_calendar",
        externalId: testExternalId,
      },
    });

    // Verify the destination calendar repository was called correctly
    expect(DestinationCalendarRepository.upsert).toHaveBeenCalledWith({
      where: { userId: organizerId },
      update: {
        integration: "google_calendar",
        externalId: testExternalId,
        primaryEmail: organizerEmail,
        credentialId: -1,
        delegationCredentialId: delegationCredentialId,
      },
      create: {
        userId: organizerId,
        integration: "google_calendar",
        externalId: testExternalId,
        primaryEmail: organizerEmail,
        credentialId: -1,
        delegationCredentialId: delegationCredentialId,
      },
    });
  });

  it("should throw error when calendar is not found", async () => {
    const organizerEmail = "organizer@example.com";
    const organizerId = 101;

    // Create mock user
    const mockUser = createMockUser({
      id: organizerId,
      email: organizerEmail,
      userLevelSelectedCalendars: [],
    });

    // Mock empty credentials and calendars
    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
    vi.mocked(getConnectedCalendars).mockResolvedValue({ connectedCalendars: [] });

    const ctx = {
      user: mockUser,
    };

    await expect(
      setDestinationCalendarHandler({
        ctx,
        input: {
          integration: "google_calendar",
          externalId: "non-existent-calendar",
        },
      })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Could not find calendar non-existent-calendar" })
    );
  });
});
