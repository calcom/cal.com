/**
 * Regression test for the IDOR / broken object-level authorization fix in
 * GoogleCalendarService#getEventDetails and #updateEventDetails.
 *
 * Originally, both methods resolved a booking reference by `eventUid` alone
 * (BookingReferencesRepository_2024_08_13#getBookingReferencesIncludeSensitiveCredentials)
 * and authenticated to Google Calendar using the CREDENTIAL OWNER's stored OAuth
 * key/delegation — without ever taking or checking a caller `userId`. Any
 * authenticated caller who knew/obtained another user's `eventUid` (e.g. from a
 * calendar invite, shared calendar, or webhook payload) could read or modify that
 * user's calendar event using the owner's own credentials.
 *
 * The fix threads `userId` from the controller through
 * UnifiedCalendarService -> GoogleCalendarService, which now compares it against
 * `bookingReference.booking.user.id` and throws NotFoundException (not
 * ForbiddenException) on mismatch — deliberately indistinguishable from the
 * "reference doesn't exist" case, so this endpoint can't be used to confirm
 * whether a given eventUid belongs to someone else.
 *
 * This test simulates two tenants:
 *   - victim  (userId 1): owns the booking / calendar credential for `eventUid`
 *   - attacker (userId 2): the caller, who knows/guesses `eventUid`
 *
 * Run: yarn jest google-calendar.idor.poc.spec.ts (from apps/api/v2)
 */

const mockDelegationFindById = jest.fn().mockResolvedValue(null);
const mockJwtAuthorize = jest.fn().mockResolvedValue(undefined);
const MockJWT = jest.fn().mockImplementation(() => ({
  authorize: mockJwtAuthorize,
}));

// Captures the calendarId/eventId/requestBody actually sent to Google so we can
// prove the call operated on the victim's calendar, not the attacker's.
const mockEventsGet = jest.fn();
const mockEventsPatch = jest.fn();
const MockCalendar = jest.fn().mockImplementation(() => ({
  events: { get: mockEventsGet, patch: mockEventsPatch },
}));

jest.mock(
  "@calcom/platform-libraries/app-store",
  () => ({
    DelegationCredentialRepository: {
      findByIdIncludeSensitiveServiceAccountKey: mockDelegationFindById,
    },
    OAuth2UniversalSchema: { parse: jest.fn((v: unknown) => v) },
  }),
  { virtual: true }
);
jest.mock(
  "@calcom/platform-libraries",
  () => ({
    getBusyCalendarTimes: jest.fn(),
    getConnectedDestinationCalendarsAndEnsureDefaultsInDb: jest.fn(),
    credentialForCalendarServiceSelect: {},
  }),
  { virtual: true }
);
jest.mock("googleapis-common", () => ({
  JWT: MockJWT,
}));
jest.mock("@googleapis/calendar", () => ({
  calendar_v3: {
    Calendar: MockCalendar,
  },
}));

import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { GoogleCalendarService } from "./google-calendar.service";
import { BookingReferencesRepository_2024_08_13 } from "@/platform/bookings/2024-08-13/repositories/booking-references.repository";
import { GoogleCalendarService as GCalService } from "@/platform/calendars/services/gcal.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";

describe("Regression: IDOR fix in GoogleCalendarService.getEventDetails / updateEventDetails", () => {
  let service: GoogleCalendarService;
  let mockBookingReferencesRepo: { getBookingReferencesIncludeSensitiveCredentials: jest.Mock };
  let mockGCalService: { getOAuthClient: jest.Mock; redirectUri: string };
  let mockCredentialsRepo: Record<string, jest.Mock>;

  const VICTIM_USER_ID = 1;
  const ATTACKER_USER_ID = 2;
  const VICTIM_EMAIL = "victim@example.com";
  const VICTIM_EVENT_UID = "victim-google-event-id-abc123"; // e.g. leaked via a calendar invite
  const VICTIM_CALENDAR_ID = "victim-primary-calendar";

  const victimBookingReference = {
    uid: VICTIM_EVENT_UID,
    externalCalendarId: VICTIM_CALENDAR_ID,
    credential: { key: { access_token: "VICTIM_ACCESS_TOKEN", refresh_token: "VICTIM_REFRESH_TOKEN" } },
    delegationCredential: null,
    booking: { user: { id: VICTIM_USER_ID, email: VICTIM_EMAIL } },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBookingReferencesRepo = {
      getBookingReferencesIncludeSensitiveCredentials: jest.fn().mockResolvedValue(victimBookingReference),
    };

    mockGCalService = {
      getOAuthClient: jest.fn().mockResolvedValue({ setCredentials: jest.fn() }),
      redirectUri: "http://localhost/callback",
    };

    mockCredentialsRepo = {
      findCredentialWithDelegationByTypeAndUserId: jest.fn(),
      findCredentialByIdAndUserId: jest.fn(),
    };

    mockEventsGet.mockResolvedValue({
      data: { id: VICTIM_EVENT_UID, summary: "Victim's private 1:1 with therapist" },
    });
    mockEventsPatch.mockResolvedValue({
      data: { id: VICTIM_EVENT_UID, summary: "PWNED by attacker" },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        { provide: BookingReferencesRepository_2024_08_13, useValue: mockBookingReferencesRepo },
        { provide: GCalService, useValue: mockGCalService },
        { provide: CredentialsRepository, useValue: mockCredentialsRepo },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
  });

  it("FIXED: an attacker with no relation to the victim can no longer read the victim's event by guessing eventUid", async () => {
    await expect(service.getEventDetails(VICTIM_EVENT_UID, ATTACKER_USER_ID)).rejects.toThrow(NotFoundException);

    // Never reached Google at all — the ownership check short-circuits before
    // any credential is used.
    expect(mockEventsGet).not.toHaveBeenCalled();
  });

  it("FIXED: an attacker with no relation to the victim can no longer modify the victim's event by guessing eventUid", async () => {
    const attackerSuppliedPayload = { title: "PWNED by attacker" };

    await expect(
      service.updateEventDetails(VICTIM_EVENT_UID, attackerSuppliedPayload, ATTACKER_USER_ID)
    ).rejects.toThrow(NotFoundException);

    expect(mockEventsPatch).not.toHaveBeenCalled();
  });

  it("FIXED: the rejection is identical to the 'reference not found' case, so existence can't be inferred", async () => {
    mockBookingReferencesRepo.getBookingReferencesIncludeSensitiveCredentials.mockResolvedValueOnce(null);
    let notFoundError: Error | undefined;
    try {
      await service.getEventDetails("does-not-exist", ATTACKER_USER_ID);
    } catch (e) {
      notFoundError = e as Error;
    }

    let ownedByOtherError: Error | undefined;
    try {
      await service.getEventDetails(VICTIM_EVENT_UID, ATTACKER_USER_ID);
    } catch (e) {
      ownedByOtherError = e as Error;
    }

    expect(notFoundError).toBeInstanceOf(NotFoundException);
    expect(ownedByOtherError).toBeInstanceOf(NotFoundException);
    expect(notFoundError?.message).toBe(ownedByOtherError?.message);
  });

  it("sanity check: the legitimate owner can still read and update their own event", async () => {
    const readResult = await service.getEventDetails(VICTIM_EVENT_UID, VICTIM_USER_ID);
    expect(readResult.summary).toBe("Victim's private 1:1 with therapist");
    expect(mockEventsGet).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: VICTIM_CALENDAR_ID, eventId: VICTIM_EVENT_UID })
    );

    const updateResult = await service.updateEventDetails(
      VICTIM_EVENT_UID,
      { title: "Rescheduled by owner" },
      VICTIM_USER_ID
    );
    expect(updateResult.summary).toBe("PWNED by attacker"); // mocked Google response, unrelated to payload
    expect(mockEventsPatch).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: VICTIM_CALENDAR_ID, eventId: VICTIM_EVENT_UID })
    );
  });
});
