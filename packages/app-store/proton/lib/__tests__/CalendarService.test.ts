import { describe, expect, it } from "vitest";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import type { CredentialPayload } from "@calcom/types/Credential";

import BuildCalendarService from "../CalendarService";

describe("Proton CalendarService", () => {
  it("should initialize ProtonCalendarService correctly with credential", () => {
    const encryptedKey = symmetricEncrypt(
      JSON.stringify({
        username: "testuser@proton.me",
        password: "testpassword",
        url: "https://caldav.proton.me",
      }),
      process.env.CALENDSO_ENCRYPTION_KEY || ""
    );

    const credential: CredentialPayload = {
      id: 1,
      type: "proton_calendar",
      key: encryptedKey,
      userId: 1,
      teamId: null,
      appId: "proton-calendar",
      invalid: false,
      user: {
        email: "testuser@proton.me",
      },
    };

    const calendarService = BuildCalendarService(credential);
    expect(calendarService).toBeDefined();
    expect(typeof calendarService.listCalendars).toBe("function");
    expect(typeof calendarService.createEvent).toBe("function");
    expect(typeof calendarService.updateEvent).toBe("function");
    expect(typeof calendarService.deleteEvent).toBe("function");
    expect(typeof calendarService.getAvailability).toBe("function");
  });
});
