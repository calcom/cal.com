import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sanitizeAndFilterGuests } from "./addGuests.handler";

vi.mock("@calcom/features/users/repositories/UserRepository");

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const findManyByEmailsWithEmailVerificationSettings = vi.fn();

type Guest = Parameters<typeof sanitizeAndFilterGuests>[0][number];

const bookingWithAttendees = (emails: string[]) =>
  ({ attendees: emails.map((email) => ({ email })) } as unknown as Parameters<
    typeof sanitizeAndFilterGuests
  >[1]);

describe("fn: sanitizeAndFilterGuests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BLACKLISTED_GUEST_EMAILS;

    findManyByEmailsWithEmailVerificationSettings.mockResolvedValue([]);

    vi.mocked(UserRepository).mockImplementation(
      () =>
        ({
          findManyByEmailsWithEmailVerificationSettings,
        } as unknown as UserRepository)
    );
  });

  it("should return the guest whose email survived deduplication", async () => {
    // Both addresses share the base email alice@x.com. deduplicateGuestEmails
    // keeps the first, so the returned object must be the first one too.
    const guests: Guest[] = [
      { email: "alice+work@x.com", name: "Alice Work" },
      { email: "alice+home@x.com", name: "Alice Home" },
    ];

    const result = await sanitizeAndFilterGuests(guests, bookingWithAttendees([]));

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual("alice+work@x.com");
    expect(result[0].name).toEqual("Alice Work");
  });

  it("should keep the first entry when the exact same email is sent twice", async () => {
    const guests: Guest[] = [
      { email: "bob@x.com", name: "First", timeZone: "Europe/London" },
      { email: "bob@x.com", name: "Second", timeZone: "Asia/Seoul" },
    ];

    const result = await sanitizeAndFilterGuests(guests, bookingWithAttendees([]));

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual("First");
    expect(result[0].timeZone).toEqual("Europe/London");
  });

  it("should keep distinct guests untouched and in order", async () => {
    const guests: Guest[] = [
      { email: "a@x.com", name: "A" },
      { email: "b@x.com", name: "B" },
      { email: "c@x.com", name: "C" },
    ];

    const result = await sanitizeAndFilterGuests(guests, bookingWithAttendees([]));

    expect(result.map((guest) => guest.email)).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
    expect(result.map((guest) => guest.name)).toEqual(["A", "B", "C"]);
  });

  it("should drop guests already attending the booking, matching on the base email", async () => {
    const guests: Guest[] = [
      { email: "dave+tag@x.com", name: "Dave" },
      { email: "erin@x.com", name: "Erin" },
    ];

    const result = await sanitizeAndFilterGuests(guests, bookingWithAttendees(["dave@x.com"]));

    expect(result.map((guest) => guest.email)).toEqual(["erin@x.com"]);
  });

  it("should drop blacklisted guests", async () => {
    process.env.BLACKLISTED_GUEST_EMAILS = "blocked@corp.com";

    const guests: Guest[] = [
      { email: "blocked+anything@corp.com", name: "Blocked" },
      { email: "fine@x.com", name: "Fine" },
    ];

    const result = await sanitizeAndFilterGuests(guests, bookingWithAttendees([]));

    expect(result.map((guest) => guest.email)).toEqual(["fine@x.com"]);
  });

  it("should throw when every guest is filtered out", async () => {
    const guests: Guest[] = [{ email: "dupe@x.com", name: "Dupe" }];

    await expect(sanitizeAndFilterGuests(guests, bookingWithAttendees(["dupe@x.com"]))).rejects.toThrow();
  });
});
