import { describe, expect, it } from "vitest";
import { getHostsAndGuests } from "./getHostsAndGuests";

describe("getHostsAndGuests", () => {
  it("returns hosts from eventType.hosts", () => {
    const booking = {
      attendees: [{ email: "host@example.com", name: "Host" }],
      user: { id: 1, email: "host@example.com" },
      eventType: {
        hosts: [{ userId: 1, user: { email: "host@example.com" } }],
        users: [],
      },
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toEqual([{ id: 1, email: "host@example.com" }]);
    expect(result.guests).toEqual([]);
  });

  it("returns guests that are not hosts", () => {
    const booking = {
      attendees: [
        { email: "host@example.com", name: "Host" },
        { email: "guest@example.com", name: "Guest" },
      ],
      user: { id: 1, email: "host@example.com" },
      eventType: {
        hosts: [{ userId: 1, user: { email: "host@example.com" } }],
        users: [],
      },
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toEqual([{ id: 1, email: "host@example.com" }]);
    expect(result.guests).toEqual([{ email: "guest@example.com", name: "Guest" }]);
  });

  it("deduplicates hosts from hosts and users arrays", () => {
    const booking = {
      attendees: [{ email: "host@example.com", name: "Host" }],
      user: { id: 1, email: "host@example.com" },
      eventType: {
        hosts: [{ userId: 1, user: { email: "host@example.com" } }],
        users: [{ id: 1, email: "host@example.com" }],
      },
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toHaveLength(1);
  });

  it("includes booking.user as host when present as attendee", () => {
    const booking = {
      attendees: [{ email: "owner@example.com", name: "Owner" }],
      user: { id: 5, email: "owner@example.com" },
      eventType: { hosts: [], users: [] },
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toEqual([{ id: 5, email: "owner@example.com" }]);
    expect(result.guests).toEqual([]);
  });

  it("handles missing eventType gracefully", () => {
    const booking = {
      attendees: [{ email: "guest@example.com", name: "Guest" }],
      user: { id: 1, email: "host@example.com" },
      eventType: null,
    };
    const result = getHostsAndGuests(booking);
    // booking.user is added as potential host, filtered by attendee emails or user.id match
    expect(result.hosts).toEqual([{ id: 1, email: "host@example.com" }]);
  });

  it("handles missing attendees", () => {
    const booking = {
      attendees: null,
      user: { id: 1, email: "host@example.com" },
      eventType: {
        hosts: [{ userId: 1, user: { email: "host@example.com" } }],
        users: [],
      },
    };
    const result = getHostsAndGuests(booking);
    expect(result.guests).toEqual([]);
  });

  it("handles multiple hosts and multiple guests", () => {
    const booking = {
      attendees: [
        { email: "host1@example.com", name: "Host 1" },
        { email: "host2@example.com", name: "Host 2" },
        { email: "guest1@example.com", name: "Guest 1" },
        { email: "guest2@example.com", name: "Guest 2" },
      ],
      user: { id: 1, email: "host1@example.com" },
      eventType: {
        hosts: [
          { userId: 1, user: { email: "host1@example.com" } },
          { userId: 2, user: { email: "host2@example.com" } },
        ],
        users: [],
      },
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toHaveLength(2);
    expect(result.guests).toHaveLength(2);
    expect(result.guests.map((g) => g.email)).toContain("guest1@example.com");
    expect(result.guests.map((g) => g.email)).toContain("guest2@example.com");
  });

  it("filters hosts to only those present in attendees or matching booking.user", () => {
    const booking = {
      attendees: [{ email: "guest@example.com", name: "Guest" }],
      user: { id: 1, email: "host1@example.com" },
      eventType: {
        hosts: [
          { userId: 1, user: { email: "host1@example.com" } },
          { userId: 2, user: { email: "host2@example.com" } },
        ],
        users: [],
      },
    };
    const result = getHostsAndGuests(booking);
    // host1 matches booking.user.id, host2 is not in attendees and doesn't match user.id
    expect(result.hosts).toHaveLength(1);
    expect(result.hosts[0].email).toBe("host1@example.com");
  });

  it("handles empty booking with no user", () => {
    const booking = {
      attendees: [{ email: "someone@example.com", name: "Someone" }],
      user: null,
      eventType: null,
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toEqual([]);
    expect(result.guests).toEqual([{ email: "someone@example.com", name: "Someone" }]);
  });

  it("uses eventType.users to identify hosts", () => {
    const booking = {
      attendees: [
        { email: "user-host@example.com", name: "User Host" },
        { email: "guest@example.com", name: "Guest" },
      ],
      user: null,
      eventType: {
        hosts: [],
        users: [{ id: 10, email: "user-host@example.com" }],
      },
    };
    const result = getHostsAndGuests(booking);
    expect(result.hosts).toEqual([{ id: 10, email: "user-host@example.com" }]);
    expect(result.guests).toEqual([{ email: "guest@example.com", name: "Guest" }]);
  });
});
