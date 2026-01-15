import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_ORGANIZER_NAME,
  NO_REPLY_EMAIL,
  formatPersonDisplay,
  formatPersonText,
  getIcsAttendee,
  type PersonDisplayOptions,
} from "./hideOrganizerUtils";

// Helper function to build person display options
const buildPersonDisplayOptions = (overrides?: Partial<PersonDisplayOptions>): PersonDisplayOptions => ({
  name: "John Doe",
  email: "john@example.com",
  role: "Organizer",
  hideOrganizerName: false,
  hideOrganizerEmail: false,
  isOrganizerExempt: false,
  ...overrides,
});

// Helper function to build person for ICS
const buildIcsPerson = (overrides?: Partial<{ name: string; email: string }>) => ({
  name: "John Doe",
  email: "john@example.com",
  ...overrides,
});

// Helper function to build ICS config
const buildIcsConfig = (overrides?: Partial<{ partstat: string; role: string; rsvp: boolean }>) => ({
  partstat: "ACCEPTED",
  role: "REQ-PARTICIPANT",
  rsvp: true,
  ...overrides,
});

describe("hideOrganizerUtils", () => {
  describe("constants", () => {
    it("should export ANONYMOUS_ORGANIZER_NAME as 'Organizer'", () => {
      expect(ANONYMOUS_ORGANIZER_NAME).toBe("Organizer");
    });

    it("should export NO_REPLY_EMAIL as 'no-reply@cal.com'", () => {
      expect(NO_REPLY_EMAIL).toBe("no-reply@cal.com");
    });
  });

  describe("formatPersonDisplay", () => {
    describe("when hiding is disabled", () => {
      it("should return original name and email", () => {
        const options = buildPersonDisplayOptions();

        const result = formatPersonDisplay(options);

        expect(result.displayName).toBe("John Doe");
        expect(result.displayEmail).toBe("john@example.com");
      });

      it("should handle undefined hide flags as false", () => {
        const options = buildPersonDisplayOptions({
          hideOrganizerName: undefined,
          hideOrganizerEmail: undefined,
        });

        const result = formatPersonDisplay(options);

        expect(result.displayName).toBe("John Doe");
        expect(result.displayEmail).toBe("john@example.com");
      });
    });

    describe("when hideOrganizerName is true", () => {
      it("should return empty string for name", () => {
        const options = buildPersonDisplayOptions({ hideOrganizerName: true });

        const result = formatPersonDisplay(options);

        expect(result.displayName).toBe("");
        expect(result.displayEmail).toBe("john@example.com");
      });
    });

    describe("when hideOrganizerEmail is true", () => {
      it("should return empty string for email", () => {
        const options = buildPersonDisplayOptions({ hideOrganizerEmail: true });

        const result = formatPersonDisplay(options);

        expect(result.displayName).toBe("John Doe");
        expect(result.displayEmail).toBe("");
      });

      it("should NOT hide email when isOrganizerExempt is true", () => {
        const options = buildPersonDisplayOptions({
          hideOrganizerEmail: true,
          isOrganizerExempt: true,
        });

        const result = formatPersonDisplay(options);

        expect(result.displayEmail).toBe("john@example.com");
      });
    });

    describe("when both hiding options are true", () => {
      it("should return empty strings for both name and email", () => {
        const options = buildPersonDisplayOptions({
          hideOrganizerName: true,
          hideOrganizerEmail: true,
        });

        const result = formatPersonDisplay(options);

        expect(result.displayName).toBe("");
        expect(result.displayEmail).toBe("");
      });
    });
  });

  describe("formatPersonText", () => {
    describe("when nothing is hidden", () => {
      it("should format with name, role, and email", () => {
        const options = buildPersonDisplayOptions();

        const result = formatPersonText(options);

        expect(result).toBe("John Doe - Organizer\njohn@example.com");
      });
    });

    describe("when name is hidden", () => {
      it("should format with only role and email", () => {
        const options = buildPersonDisplayOptions({ hideOrganizerName: true });

        const result = formatPersonText(options);

        expect(result).toBe("Organizer\njohn@example.com");
      });
    });

    describe("when email is hidden", () => {
      it("should format with name and role only", () => {
        const options = buildPersonDisplayOptions({ hideOrganizerEmail: true });

        const result = formatPersonText(options);

        expect(result).toBe("John Doe - Organizer");
      });
    });

    describe("when both are hidden", () => {
      it("should format with only role", () => {
        const options = buildPersonDisplayOptions({
          hideOrganizerName: true,
          hideOrganizerEmail: true,
        });

        const result = formatPersonText(options);

        expect(result).toBe("Organizer");
      });

      it("should show email when isOrganizerExempt is true", () => {
        const options = buildPersonDisplayOptions({
          hideOrganizerName: true,
          hideOrganizerEmail: true,
          isOrganizerExempt: true,
        });

        const result = formatPersonText(options);

        expect(result).toBe("Organizer\njohn@example.com");
      });
    });

    describe("with different roles", () => {
      it("should use the provided role in output", () => {
        const options = buildPersonDisplayOptions({ role: "Team member" });

        const result = formatPersonText(options);

        expect(result).toBe("John Doe - Team member\njohn@example.com");
      });
    });
  });

  describe("getIcsAttendee", () => {
    describe("when hiding is disabled", () => {
      it("should return original name and email", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(person, { hideOrganizerName: false, hideOrganizerEmail: false }, false);

        expect(result.name).toBe("John Doe");
        expect(result.email).toBe("john@example.com");
      });

      it("should handle undefined hide flags as false", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(person, {}, false);

        expect(result.name).toBe("John Doe");
        expect(result.email).toBe("john@example.com");
      });
    });

    describe("when hideOrganizerName is true", () => {
      it("should return ANONYMOUS_ORGANIZER_NAME constant", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(person, { hideOrganizerName: true, hideOrganizerEmail: false }, false);

        expect(result.name).toBe(ANONYMOUS_ORGANIZER_NAME);
        expect(result.email).toBe("john@example.com");
      });
    });

    describe("when hideOrganizerEmail is true", () => {
      it("should return NO_REPLY_EMAIL constant", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(person, { hideOrganizerName: false, hideOrganizerEmail: true }, false);

        expect(result.name).toBe("John Doe");
        expect(result.email).toBe(NO_REPLY_EMAIL);
      });

      it("should NOT hide email when isOrganizerExempt is true", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(
          person,
          { hideOrganizerName: false, hideOrganizerEmail: true },
          true // isOrganizerExempt
        );

        expect(result.email).toBe("john@example.com");
      });
    });

    describe("when both hiding options are true", () => {
      it("should return both hidden values", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(person, { hideOrganizerName: true, hideOrganizerEmail: true }, false);

        expect(result.name).toBe(ANONYMOUS_ORGANIZER_NAME);
        expect(result.email).toBe(NO_REPLY_EMAIL);
      });
    });

    describe("icsConfig handling", () => {
      it("should NOT include icsConfig when not provided (for organizers)", () => {
        const person = buildIcsPerson();

        const result = getIcsAttendee(person, {}, false);

        expect(result).toEqual({
          name: "John Doe",
          email: "john@example.com",
        });
        expect(result).not.toHaveProperty("partstat");
        expect(result).not.toHaveProperty("role");
        expect(result).not.toHaveProperty("rsvp");
      });

      it("should include icsConfig when provided (for attendees)", () => {
        const person = buildIcsPerson();
        const icsConfig = buildIcsConfig();

        const result = getIcsAttendee(person, {}, false, icsConfig);

        expect(result).toEqual({
          name: "John Doe",
          email: "john@example.com",
          partstat: "ACCEPTED",
          role: "REQ-PARTICIPANT",
          rsvp: true,
        });
      });

      it("should include icsConfig with hidden values", () => {
        const person = buildIcsPerson();
        const icsConfig = buildIcsConfig();

        const result = getIcsAttendee(
          person,
          { hideOrganizerName: true, hideOrganizerEmail: true },
          false,
          icsConfig
        );

        expect(result).toEqual({
          name: ANONYMOUS_ORGANIZER_NAME,
          email: NO_REPLY_EMAIL,
          partstat: "ACCEPTED",
          role: "REQ-PARTICIPANT",
          rsvp: true,
        });
      });
    });
  });
});
