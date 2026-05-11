import { describe, expect, it } from "vitest";
import { getProtonCalendarExternalId } from "./protonCalendarId";

describe("getProtonCalendarExternalId", () => {
  it("does not expose the Proton share link", () => {
    const url =
      "https://calendar.proton.me/api/calendar/v1/url/example/calendar.ics?CacheKey=secret&PassphraseKey=secret";

    const externalId = getProtonCalendarExternalId(url);

    expect(externalId).toMatch(/^proton-[a-f0-9]{32}$/);
    expect(externalId).not.toContain("calendar.proton.me");
    expect(externalId).not.toContain("secret");
  });
});
