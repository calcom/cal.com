import { SchedulingType } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import {
  dynamicEvent,
  getDefaultEvent,
  getDynamicEventDescription,
  getDynamicEventName,
  getGroupName,
  getUsernameList,
  getUsernameSlugLink,
} from "./defaultEvents";

describe("getUsernameList", () => {
  it("returns single username string as array", () => {
    expect(getUsernameList("alice")).toEqual(["alice"]);
  });

  it("splits multiple usernames with + separator", () => {
    expect(getUsernameList("alice+bob")).toEqual(["alice", "bob"]);
  });

  it("splits multiple usernames with space separator", () => {
    expect(getUsernameList("alice bob")).toEqual(["alice", "bob"]);
  });

  it("splits multiple usernames with %20 separator", () => {
    expect(getUsernameList("alice%20bob")).toEqual(["alice", "bob"]);
  });

  it("splits multiple usernames with %2b separator", () => {
    expect(getUsernameList("alice%2bbob")).toEqual(["alice", "bob"]);
  });

  it("passes through array input", () => {
    expect(getUsernameList(["alice", "bob"])).toEqual(["alice", "bob"]);
  });

  it("returns empty array for undefined", () => {
    expect(getUsernameList(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(getUsernameList("")).toEqual([]);
  });
});

describe("getDefaultEvent", () => {
  it('returns dynamicEvent for known slug "dynamic"', () => {
    const event = getDefaultEvent("dynamic");
    expect(event.length).toBe(30);
    expect(event.title).toBe("Group Meeting");
    expect(event.slug).toBe("dynamic");
  });

  it("returns dynamicEvent as fallback for unknown slug", () => {
    const event = getDefaultEvent("nonexistent");
    expect(event.slug).toBe("dynamic");
    expect(event.length).toBe(30);
  });

  it("returns dynamicEvent as fallback for empty string slug", () => {
    const event = getDefaultEvent("");
    expect(event.slug).toBe("dynamic");
  });
});

describe("getDynamicEventDescription", () => {
  it("generates description for two usernames", () => {
    expect(getDynamicEventDescription(["alice", "bob"], "30")).toBe("Book a 30 min event with alice, bob");
  });

  it("generates description for single username", () => {
    expect(getDynamicEventDescription(["alice"], "15")).toBe("Book a 15 min event with alice");
  });
});

describe("getDynamicEventName", () => {
  it("generates name for multiple names", () => {
    expect(getDynamicEventName(["Alice", "Bob"], "30")).toBe(
      "Dynamic Collective 30 min event with Alice & Bob"
    );
  });
});

describe("getGroupName", () => {
  it("joins usernames with comma", () => {
    expect(getGroupName(["alice", "bob"])).toBe("alice, bob");
  });
});

describe("getUsernameSlugLink", () => {
  it("returns link for single user", () => {
    expect(getUsernameSlugLink({ users: [{ username: "alice" }], slug: "meeting" })).toBe("/alice/meeting");
  });

  it("returns combined link for multiple users", () => {
    expect(
      getUsernameSlugLink({
        users: [{ username: "alice" }, { username: "bob" }],
        slug: "meeting",
      })
    ).toBe("/alice+bob/meeting");
  });

  it("returns link with null username", () => {
    expect(getUsernameSlugLink({ users: [{ username: null }], slug: "meeting" })).toBe("/null/meeting");
  });
});

describe("dynamicEvent constant", () => {
  it("has correct structure", () => {
    expect(dynamicEvent.length).toBe(30);
    expect(dynamicEvent.slug).toBe("dynamic");
    expect(dynamicEvent.isDynamic).toBe(true);
    expect(dynamicEvent.schedulingType).toBe(SchedulingType.COLLECTIVE);
    expect(dynamicEvent.title).toBe("Group Meeting");
  });
});
