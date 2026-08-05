import { describe, expect, it, vi } from "vitest";

import { sanitizeAndFilterGuests } from "./addGuests.handler";

vi.mock("@calcom/lib/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findManyByEmailsWithEmailVerificationSettings: vi.fn().mockResolvedValue([]),
  })),
}));

describe("sanitizeAndFilterGuests deduplication", () => {
  it("keeps the first guest object when emails differ only by plus-addressing", async () => {
    const guests = [
      { email: "john+1@example.com", name: "John First" },
      { email: "john+2@example.com", name: "John Second" },
    ];

    const mockBooking = {
      attendees: [],
    } as any;

    const result = await sanitizeAndFilterGuests(guests, mockBooking);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      email: "john+1@example.com",
      name: "John First",
    });
  });
});
