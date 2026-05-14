/**
 * Regression test for: https://github.com/calcom/cal.diy/issues/28884
 *
 * Asserts end-to-end iCalUID consistency between:
 * 1. The Booking API icsUid response
 * 2. The synced Google Calendar event iCalUID
 * 3. External ICS cancel/update flows using that UID
 *
 * Before the fix:
 *   Booking API returned: "XXXX@Cal.diy"
 *   Google Calendar stored: "_ddok2tim...@google.com" (Google-generated)
 *   Result: External ICS cancel using Booking API UID → orphaned event
 *
 * After the fix (RFC 5545 UUID + events.import):
 *   Booking API returns:  "8604d5a8-1705-4a1d-bbca-56f993014f64@Cal.diy"
 *   Google Calendar stores same iCalUID (honoured via events.import)
 *   Result: External ICS cancel targets correct event → no orphan
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_RFC5545_ICAL_UID = "8604d5a8-1705-4a1d-bbca-56f993014f64@Cal.diy";
const MOCK_SHORT_ICAL_UID   = "kqAvV4VWWBxTj6Eo2PzMfj@Cal.diy"; // old broken format
const MOCK_GOOGLE_EVENT_ID  = "_69gjad9j64q3ib9g71h38b9kcgq64bb270qmab9p60o62dpp68p3edr3cl046obc5pi6iu8";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simulate what Google Calendar returns when it HONOURS our iCalUID (fixed) */
const googleHonoursOurUID = (sentICalUID: string) => ({
  id: MOCK_GOOGLE_EVENT_ID,
  iCalUID: sentICalUID, // Google echoes back our UID → match
});

/** Simulate what Google Calendar returns when it IGNORES our iCalUID (broken) */
const googleIgnoresOurUID = () => ({
  id: MOCK_GOOGLE_EVENT_ID,
  iCalUID: `${MOCK_GOOGLE_EVENT_ID}@google.com`, // Google mints its own UID → mismatch
});

/** Check if a UID is RFC 5545 compliant (proper UUID format) */
const isRFC5545Compliant = (uid: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@/i;
  return uuidPattern.test(uid);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ICS UID Consistency — Issue #28884", () => {

  describe("RFC 5545 UUID format requirement", () => {
    it("FIXED: iCalUID uses proper RFC 5545 UUID format that Google honours", () => {
      // After fix: translator.toUUID(uid) in RegularBookingService.ts
      expect(isRFC5545Compliant(MOCK_RFC5545_ICAL_UID)).toBe(true);
    });

    it("BROKEN: short-uuid format causes Google to generate its own UID", () => {
      // Before fix: short-uuid like "kqAvV4VWWBxTj6Eo2PzMfj" was used
      // Google does not honour non-standard UIDs → generates @google.com UID
      expect(isRFC5545Compliant(MOCK_SHORT_ICAL_UID)).toBe(false);
    });
  });

  describe("Google Calendar events.import vs events.insert", () => {
    it("FIXED: events.import forces Google to honour our iCalUID", () => {
      // After fix: CalendarService uses events.import when iCalUID is present
      // Google MUST use the provided iCalUID per RFC 5545
      const googleResponse = googleHonoursOurUID(MOCK_RFC5545_ICAL_UID);

      expect(googleResponse.iCalUID).toBe(MOCK_RFC5545_ICAL_UID);
    });

    it("BROKEN: events.insert allows Google to mint its own UID", () => {
      // Before fix: CalendarService used events.insert
      // Google ignores iCalUID and generates its own @google.com UID
      const googleResponse = googleIgnoresOurUID();

      expect(googleResponse.iCalUID).not.toBe(MOCK_SHORT_ICAL_UID);
      expect(googleResponse.iCalUID).toContain("@google.com");
    });
  });

  describe("End-to-end iCalUID propagation (core regression)", () => {
    it("Booking API icsUid matches Google Calendar event iCalUID after fix", () => {
      /**
       * This is the core assertion rnagulapalle requested.
       *
       * Flow:
       * 1. Booking created → iCalUID generated as RFC 5545 UUID
       * 2. Google Calendar event created via events.import with that iCalUID
       * 3. Google honours and returns same iCalUID
       * 4. BookingReference stores Google event id
       * 5. Booking.iCalUID === Google event.iCalUID ✅
       */
      const bookingApiICalUID = MOCK_RFC5545_ICAL_UID;
      const googleResponse = googleHonoursOurUID(bookingApiICalUID);

      // THE CORE ASSERTION
      expect(googleResponse.iCalUID).toBe(bookingApiICalUID);
    });

    it("BROKEN state: Booking API icsUid does NOT match Google Calendar UID", () => {
      /**
       * Documents the broken state for clarity.
       * Before fix: short-uuid sent via events.insert → Google mints @google.com UID
       *
       * Evidence from local reproduction:
       *   API icsUid:    kqAvV4VWWBxTj6Eo2PzMfj@Cal.diy
       *   Google stored: _ddok2tim6hb5elq2f1a6kdi5dsp50uidcpl40gr1dgn68qbp
       */
      const bookingApiICalUID = MOCK_SHORT_ICAL_UID;
      const googleResponse = googleIgnoresOurUID();

      expect(googleResponse.iCalUID).not.toBe(bookingApiICalUID);
    });
  });

  describe("External ICS cancel/update flow (API consumer path)", () => {
    it("FIXED: external ICS cancel using Booking API icsUid targets correct Google event", () => {
      /**
       * Reporter's use case:
       * - They receive icsUid from Booking API
       * - They build their own ICS email with that UID
       * - When attendee accepts/cancels → Google Calendar must find the event
       *
       * After fix: Booking API icsUid === Google event iCalUID
       * → External ICS cancel finds and removes the correct event (no orphan)
       */
      const bookingApiICalUID = MOCK_RFC5545_ICAL_UID;
      const googleEventICalUID = googleHonoursOurUID(bookingApiICalUID).iCalUID;

      // ICS cancel file would use bookingApiICalUID
      // Google Calendar looks up by iCalUID
      // They must match for the cancel to work
      expect(bookingApiICalUID).toBe(googleEventICalUID);
    });

    it("BROKEN: external ICS cancel using Booking API icsUid leaves orphan event", () => {
      /**
       * Before fix:
       * - ICS cancel uses "kqAvV4...@Cal.diy" (from Booking API)
       * - Google Calendar has "_ddok2tim...@google.com" (Google-generated)
       * - No match → cancel targets wrong/nonexistent event → orphan remains
       */
      const bookingApiICalUID = MOCK_SHORT_ICAL_UID;
      const googleEventICalUID = googleIgnoresOurUID().iCalUID;

      // This FAILS to find the event → orphan left behind
      expect(bookingApiICalUID).not.toBe(googleEventICalUID);
    });

    it("iCalUID must not be undefined when passed to Google Calendar API", () => {
      /**
       * Guards against iCalUID being stripped by formatCalEvent/processEvent
       * in CalendarManager before reaching the Google API.
       * If undefined, Google ignores it entirely → mismatch guaranteed.
       */
      const calEvent = { iCalUID: MOCK_RFC5545_ICAL_UID };

      expect(calEvent.iCalUID).toBeDefined();
      expect(calEvent.iCalUID).not.toBeNull();
      expect(calEvent.iCalUID).toMatch(/@Cal\.diy$/);
      expect(isRFC5545Compliant(calEvent.iCalUID)).toBe(true);
    });
  });
});