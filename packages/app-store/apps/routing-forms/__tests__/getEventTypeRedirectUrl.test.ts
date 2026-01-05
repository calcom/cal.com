import { describe, it, expect } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { getAbsoluteEventTypeRedirectUrl } from "../getEventTypeRedirectUrl";

describe("getAbsoluteEventTypeRedirectUrl", () => {
  const defaultForm = {
    team: null,
    nonOrgUsername: null,
    nonOrgTeamslug: null,
    userOrigin: "https://user.cal.com",
    teamOrigin: "https://team.cal.com",
    user: {
      username: null,
    },
  };

  const defaultParams = {
    eventTypeRedirectUrl: "user/event",
    form: defaultForm,
    allURLSearchParams: new URLSearchParams(),
    isEmbed: false,
  };

  it("should return WEBAPP_URL for non-migrated user", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "old-user/event",
      form: {
        ...defaultForm,
        nonOrgUsername: "old-user",
        user: { username: "new-user" },
      },
    });
    expect(result).toBe(`${WEBAPP_URL}/old-user/event?`);
  });

  it("should return user origin for migrated user", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event",
      form: {
        ...defaultForm,
        nonOrgUsername: "user",
        user: { username: "user" },
      },
    });
    expect(result).toBe("https://user.cal.com/user/event?");
  });

  it("should return WEBAPP_URL for non-migrated team", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "team/team1/event",
      form: { ...defaultForm, nonOrgTeamslug: "team1" },
    });
    expect(result).toBe(`${WEBAPP_URL}/team/team1/event?`);
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

  it("should use '&' separator when redirect URL already contains query parameters", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event?existing=param",
      allURLSearchParams: new URLSearchParams("foo=bar"),
    });
    expect(result).toBe("https://user.cal.com/user/event?existing=param&foo=bar");
  });

  it("should merge with '&' when redirect URL already contains multiple query parameters", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event?existing1=param1&existing2=param2",
      allURLSearchParams: new URLSearchParams("foo=bar"),
    });
    expect(result).toBe("https://user.cal.com/user/event?existing1=param1&existing2=param2&foo=bar");
  });

  it("should merge with '&' when no URL search params are present", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event?existing=param",
      allURLSearchParams: new URLSearchParams(),
    });
    expect(result).toBe("https://user.cal.com/user/event?existing=param&");
  });

  it("should merge when redirect URL ends with '/'", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event/",
      allURLSearchParams: new URLSearchParams("foo=bar"),
    });
    expect(result).toBe("https://user.cal.com/user/event/?foo=bar");
  });

  it("should be able to merge when redirect URL ends with '?'", () => {
    const result = getAbsoluteEventTypeRedirectUrl({
      ...defaultParams,
      eventTypeRedirectUrl: "user/event?",
      allURLSearchParams: new URLSearchParams("foo=bar"),
    });
    expect(result).toBe("https://user.cal.com/user/event?&foo=bar");
  });
});
