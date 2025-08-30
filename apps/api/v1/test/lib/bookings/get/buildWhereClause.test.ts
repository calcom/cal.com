import { describe, it, expect } from "vitest";

import { buildWhereClause } from "~/lib/utils/bookings/get/buildWhereClause";

describe("buildWhereClause", () => {
  it("should return empty object when no filters are provided", () => {
    const result = buildWhereClause(null, [], []);
    expect(result).toEqual({});
  });

  it("should filter by userId when only userId is provided", () => {
    const userId = 123;
    const result = buildWhereClause(userId, [], []);
    expect(result).toEqual({ userId: 123 });
  });

  it("should filter by userIds when userIds array is provided", () => {
    const userIds = [1, 2, 3];
    const result = buildWhereClause(null, [], userIds);
    expect(result).toEqual({ userId: { in: [1, 2, 3] } });
  });

  it("should filter by attendee emails when provided", () => {
    const attendeeEmails = ["test@example.com", "user@example.com"];
    const result = buildWhereClause(null, attendeeEmails, []);
    expect(result).toEqual({
      AND: [
        {},
        {
          attendees: {
            some: {
              email: { in: ["test@example.com", "user@example.com"] },
            },
          },
        },
      ],
    });
  });

  it("should combine userId and attendee email filters", () => {
    const userId = 123;
    const attendeeEmails = ["test@example.com"];
    const result = buildWhereClause(userId, attendeeEmails, []);
    expect(result).toEqual({
      AND: [
        { userId: 123 },
        {
          attendees: {
            some: {
              email: { in: ["test@example.com"] },
            },
          },
        },
      ],
    });
  });

  it("should combine userIds and attendee email filters", () => {
    const userIds = [1, 2, 3];
    const attendeeEmails = ["test@example.com"];
    const result = buildWhereClause(null, attendeeEmails, userIds);
    expect(result).toEqual({
      AND: [
        { userId: { in: [1, 2, 3] } },
        {
          attendees: {
            some: {
              email: { in: ["test@example.com"] },
            },
          },
        },
      ],
    });
  });
});
