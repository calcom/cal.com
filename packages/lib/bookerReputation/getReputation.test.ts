import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";
import { MIN_BOOKINGS } from "./constants";
import { getReputationByEmailsUncached } from "./getReputation";

// Match the `where` shape used by getReputationByEmailsUncached so the mock's
// `.mockResolvedValue` is asserted to receive exactly the expected filter.
type GroupByWhere = {
  email: { in: string[] };
  noShow?: true;
  booking: { status: typeof BookingStatus.ACCEPTED; endTime: { lt: Date } };
};
const totalWhere = (emails: string[]): GroupByWhere => ({
  email: { in: emails },
  booking: { status: BookingStatus.ACCEPTED, endTime: { lt: expect.any(Date) } },
});
const noShowWhere = (emails: string[]): Required<GroupByWhere> => ({
  email: { in: emails },
  noShow: true,
  booking: { status: BookingStatus.ACCEPTED, endTime: { lt: expect.any(Date) } },
});

describe("getReputationByEmailsUncached", () => {
  beforeEach(() => {
    vi.useRealTimers();
    prismaMock.attendee.groupBy.mockReset();
  });

  it("returns {} for an empty email set (no DB calls)", async () => {
    const result = await getReputationByEmailsUncached([], prismaMock);
    expect(result).toEqual({});
    expect(prismaMock.attendee.groupBy).not.toHaveBeenCalled();
  });

  it("dedupes emails and filters falsy before querying", async () => {
    prismaMock.attendee.groupBy
      .mockResolvedValueOnce([{ email: "a@x.com", _count: { _all: 5 } }])
      .mockResolvedValueOnce([{ email: "a@x.com", _count: { _all: 1 } }]);

    await getReputationByEmailsUncached(
      ["a@x.com", "a@x.com", ""],
      prismaMock
    );

    // Both groupBy calls receive the deduped, filtered set.
    expect(prismaMock.attendee.groupBy).toHaveBeenCalledTimes(2);
    const firstArgs = prismaMock.attendee.groupBy.mock.calls[0][0] as {
      where: { email: { in: string[] } };
    };
    expect(firstArgs.where.email.in).toEqual(["a@x.com"]);
  });

  it("computes score from totals + no-shows for each email", async () => {
    // Two emails, both above the min-sample threshold.
    prismaMock.attendee.groupBy
      // totals
      .mockResolvedValueOnce([
        { email: "good@x.com", _count: { _all: 20 } },
        { email: "flake@x.com", _count: { _all: 10 } },
      ])
      // no-shows
      .mockResolvedValueOnce([
        { email: "flake@x.com", _count: { _all: 3 } },
      ]);

    const result = await getReputationByEmailsUncached(
      ["good@x.com", "flake@x.com"],
      prismaMock
    );

    // good@x.com: 0/20 -> 100 -> reliable
    expect(result["good@x.com"]).toEqual({
      score: 100,
      noShowCount: 0,
      totalCount: 20,
      isSuspiciousEmail: false,
    });
    // flake@x.com: 3/10 -> 70 -> occasional
    expect(result["flake@x.com"]).toEqual({
      score: 70,
      noShowCount: 3,
      totalCount: 10,
      isSuspiciousEmail: false,
    });
  });

  it("returns null score (New booker band) for emails below the min-sample threshold", async () => {
    prismaMock.attendee.groupBy
      .mockResolvedValueOnce([
        { email: "new@x.com", _count: { _all: MIN_BOOKINGS - 1 } },
      ])
      .mockResolvedValueOnce([]);

    const result = await getReputationByEmailsUncached(["new@x.com"], prismaMock);

    expect(result["new@x.com"]).toEqual({
      score: null,
      noShowCount: 0,
      totalCount: MIN_BOOKINGS - 1,
      isSuspiciousEmail: false,
    });
  });

  it("treats missing totals as 0 (email was in the set but had no past ACCEPTED bookings)", async () => {
    prismaMock.attendee.groupBy
      .mockResolvedValueOnce([]) // no totals row for this email
      .mockResolvedValueOnce([]); // no no-show row

    const result = await getReputationByEmailsUncached(["never@x.com"], prismaMock);

    expect(result["never@x.com"]).toEqual({
      score: null,
      noShowCount: 0,
      totalCount: 0,
      isSuspiciousEmail: false,
    });
  });

  it("sends the ACCEPTED-only + past-endTime filter to both groupBy calls", async () => {
    prismaMock.attendee.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await getReputationByEmailsUncached(["a@x.com"], prismaMock);

    const calls = prismaMock.attendee.groupBy.mock.calls as Array<
      Array<{
        where: object;
        by: string[];
        _count: object;
      }>
    >;
    const totalArgs = calls[0][0];
    const noShowArgs = calls[1][0];

    expect(totalArgs.where).toEqual(totalWhere(["a@x.com"]));
    expect(totalArgs.by).toEqual(["email"]);
    expect(totalArgs._count).toEqual({ _all: true });

    expect(noShowArgs.where).toEqual(noShowWhere(["a@x.com"]));
    expect(noShowArgs.by).toEqual(["email"]);
    expect(noShowArgs._count).toEqual({ _all: true });
  });
});