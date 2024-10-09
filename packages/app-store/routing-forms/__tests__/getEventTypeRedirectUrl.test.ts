import { describe, it, expect } from "vitest";

import { CAL_URL } from "@calcom/lib/constants";

import { getAbsoluteEventTypeRedirectUrl } from "../getEventTypeRedirectUrl";

describe("getAbsoluteEventTypeRedirectUrl", () => {
  const defaultForm = {
    team: null,
    nonOrgUsername: null,
    nonOrgTeamslug: null,
    userOrigin: "https://user.cal.com",
    teamOrigin: "https://team.cal.com",
  };

  const defaultParams = {
    eventTypeRedirectUrl: "user/event",
    form: defaultForm,
    allURLSearchParams: new URLSearchParams(),
    isEmbed: false,
  };

  it("should return CAL_URL for non-migrated user", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event",
      form: { ...defaultForm, nonOrgUsername: "user" },
    });
    expect(result).toBe(`${CAL_URL}/user/event?`);
  });

  it("should return user origin for migrated user", () => {
    const result = getAbsoluteEventTypeRedirectUrl(defaultParams);
    expect(result).toBe("https://user.cal.com/user/event?");
  });

  it("should return CAL_URL for non-migrated team", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "team/team1/event",
      form: { ...defaultForm, nonOrgTeamslug: "team1" },
    });
    expect(result).toBe(`${CAL_URL}/team/team1/event?`);
  });

  it("should return team origin for migrated team", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "team/team1/event",
    });
    expect(result).toBe("https://team.cal.com/team/team1/event?");
  });

  it("should append URL search params", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      allURLSearchParams: new URLSearchParams("foo=bar&baz=qux"),
    });
    expect(result).toBe("https://user.cal.com/user/event?foo=bar&baz=qux");
  });

  it("should append /embed for embedded views", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      allURLSearchParams: new URLSearchParams("foo=bar&baz=qux"),
      isEmbed: true,
    });
    expect(result).toBe("https://user.cal.com/user/event/embed?foo=bar&baz=qux");
  });

  it("should throw an error if invalid team event redirect URL is provided", () => {
    expect(() =>
      getAbsoluteEventTypeRedirectUrl({
        ...defaultParams,
        eventTypeRedirectUrl: "team/",
      })
    ).toThrow("eventTypeRedirectUrl must have username or teamSlug");
  });
});
