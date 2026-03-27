import { describe, expect, it } from "vitest";
import { getInstantMeetingConnectUrl, getInstantMeetingFallbackUrl } from "./getInstantMeetingFallbackUrl";

describe("getInstantMeetingFallbackUrl", () => {
  it("returns just the pathname when there are no URL params", () => {
    expect(getInstantMeetingFallbackUrl("/team/meeting", "")).toBe("/team/meeting");
  });

  it("strips isInstantMeeting param", () => {
    expect(getInstantMeetingFallbackUrl("/team/meeting", "?isInstantMeeting=true")).toBe("/team/meeting");
  });

  it("strips bookingId param", () => {
    expect(getInstantMeetingFallbackUrl("/team/meeting", "?bookingId=123")).toBe("/team/meeting");
  });

  it("strips bookingUid param", () => {
    expect(getInstantMeetingFallbackUrl("/team/meeting", "?bookingUid=abc-123")).toBe("/team/meeting");
  });

  it("strips all instant meeting params at once", () => {
    expect(
      getInstantMeetingFallbackUrl(
        "/team/meeting",
        "?isInstantMeeting=true&bookingId=123&bookingUid=abc-123&slot=2026-03-26T10%3A00%3A00Z&date=2026-03-26&month=2026-03"
      )
    ).toBe("/team/meeting");
  });

  it("strips slot param injected by instant meeting store", () => {
    expect(
      getInstantMeetingFallbackUrl("/team/meeting", "?isInstantMeeting=true&slot=2026-03-26T10%3A00%3A00Z")
    ).toBe("/team/meeting");
  });

  it("strips date and month params injected by instant meeting store", () => {
    expect(
      getInstantMeetingFallbackUrl(
        "/team/meeting",
        "?isInstantMeeting=true&date=2026-03-26&month=2026-03&teamMemberEmail=user%40example.com"
      )
    ).toBe("/team/meeting?teamMemberEmail=user%40example.com");
  });

  it("preserves non-instant-meeting params like teamMemberEmail", () => {
    expect(
      getInstantMeetingFallbackUrl(
        "/team/meeting",
        "?isInstantMeeting=true&bookingId=123&teamMemberEmail=user%40example.com"
      )
    ).toBe("/team/meeting?teamMemberEmail=user%40example.com");
  });

  it("preserves metadata params", () => {
    expect(
      getInstantMeetingFallbackUrl(
        "/team/meeting",
        "?isInstantMeeting=true&metadata[source]=routing&metadata[campaign]=q1"
      )
    ).toBe("/team/meeting?metadata%5Bsource%5D=routing&metadata%5Bcampaign%5D=q1");
  });

  it("preserves multiple routed team member params", () => {
    expect(
      getInstantMeetingFallbackUrl(
        "/team/meeting",
        "?isInstantMeeting=true&bookingUid=abc&routedTeamMemberIds=1&routedTeamMemberIds=2"
      )
    ).toBe("/team/meeting?routedTeamMemberIds=1&routedTeamMemberIds=2");
  });

  it("preserves cal.tz and duration but strips slot", () => {
    expect(
      getInstantMeetingFallbackUrl(
        "/team/meeting",
        "?isInstantMeeting=true&cal.tz=America%2FNew_York&duration=30&slot=2026-03-26T10%3A00%3A00Z"
      )
    ).toBe("/team/meeting?cal.tz=America%2FNew_York&duration=30");
  });

  it("returns just pathname when only instant meeting params exist", () => {
    expect(
      getInstantMeetingFallbackUrl("/org/team/event", "?isInstantMeeting=true&bookingId=456&bookingUid=xyz")
    ).toBe("/org/team/event");
  });

  it("handles search string without leading question mark", () => {
    expect(getInstantMeetingFallbackUrl("/team/meeting", "isInstantMeeting=true&name=John")).toBe(
      "/team/meeting?name=John"
    );
  });
});

describe("getInstantMeetingConnectUrl", () => {
  it("adds isInstantMeeting=true when no existing params", () => {
    expect(getInstantMeetingConnectUrl("/team/meeting", "")).toBe("/team/meeting?isInstantMeeting=true");
  });

  it("preserves existing params and adds isInstantMeeting=true", () => {
    expect(
      getInstantMeetingConnectUrl("/team/meeting", "?teamMemberEmail=user%40example.com&duration=30")
    ).toBe("/team/meeting?teamMemberEmail=user%40example.com&duration=30&isInstantMeeting=true");
  });

  it("preserves routed team member params", () => {
    expect(
      getInstantMeetingConnectUrl(
        "/team/meeting",
        "?routedTeamMemberIds=1&routedTeamMemberIds=2&cal.tz=America%2FNew_York"
      )
    ).toBe(
      "/team/meeting?routedTeamMemberIds=1&routedTeamMemberIds=2&cal.tz=America%2FNew_York&isInstantMeeting=true"
    );
  });

  it("preserves metadata params", () => {
    expect(getInstantMeetingConnectUrl("/team/meeting", "?metadata[source]=routing")).toBe(
      "/team/meeting?metadata%5Bsource%5D=routing&isInstantMeeting=true"
    );
  });

  it("overwrites existing isInstantMeeting param rather than duplicating", () => {
    expect(getInstantMeetingConnectUrl("/team/meeting", "?isInstantMeeting=false&name=John")).toBe(
      "/team/meeting?isInstantMeeting=true&name=John"
    );
  });
});
