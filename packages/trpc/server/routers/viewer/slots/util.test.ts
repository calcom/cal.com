import { describe, expect, it } from "vitest";

import type { GetAvailabilityUser } from "@calcom/core/getUserAvailability";

import { getUsersWithCredentialsConsideringContactOwner } from "./util";

describe("getUsersWithCredentialsConsideringContactOwner", () => {
  const createMockUser = (email: string): GetAvailabilityUser => ({
    id: Math.random(),
    email,
    username: email.split("@")[0],
    timeZone: "UTC",
    defaultScheduleId: null,
    bufferTime: 0,
    availability: [],
    credentials: [],
    schedules: [],
    allSelectedCalendars: [],
    userLevelSelectedCalendars: [],
    startTime: +new Date(),
    endTime: +new Date(),
    travelSchedules: [],
    timeFormat: null,
  });

  it("should return all hosts when contact owner does not exist", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: "nonexistent@example.com",
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "host2@example.com"]);
  });

  it("should return all hosts when contact owner is a fixed host", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: "host1@example.com",
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "host2@example.com"]);
  });

  it("should return contact owner and fixed hosts when contact owner is not fixed", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
      { isFixed: false, user: createMockUser("contactowner@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: "contactowner@example.com",
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "contactowner@example.com"]);
  });

  it("should return all hosts when contactOwnerEmail is null", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: null,
      hosts,
    });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(["host1@example.com", "host2@example.com"]);
  });

  it("should return only fixed hosts when there's no contact owner", () => {
    const hosts = [
      { isFixed: true, user: createMockUser("host1@example.com") },
      { isFixed: false, user: createMockUser("host2@example.com") },
      { isFixed: true, user: createMockUser("host3@example.com") },
    ];
    const result = getUsersWithCredentialsConsideringContactOwner({
      contactOwnerEmail: null,
      hosts,
    });
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.email)).toEqual([
      "host1@example.com",
      "host2@example.com",
      "host3@example.com",
    ]);
  });
});
