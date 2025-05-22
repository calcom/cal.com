import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

import { filterHostsBySameRoundRobinHost } from "./filterHostsBySameRoundRobinHost";
import * as routingUtils from "./routing/utils";

vi.mock("./routing/utils");

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("filterHostsBySameRoundRobinHost", () => {
  it("skips filter if rescheduleWithSameRoundRobinHost set to false", async () => {
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
    ];

    vi.mocked(routingUtils.isRerouting).mockReturnValue(false);

    await expect(
      filterHostsBySameRoundRobinHost({
        hosts,
        rescheduleUid: "some-uid",
        rescheduleWithSameRoundRobinHost: false,
        routedTeamMemberIds: null,
      })
    ).resolves.toStrictEqual(hosts);
  });

  it("skips filter if rerouting", async () => {
    const hosts = [
      { isFixed: true as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
    ];

    vi.mocked(routingUtils.isRerouting).mockReturnValue(true);

    const result = await filterHostsBySameRoundRobinHost({
      hosts,
      rescheduleUid: "some-uid",
      rescheduleWithSameRoundRobinHost: true,
      routedTeamMemberIds: [23],
    });

    expect(result).toStrictEqual(hosts);
  });

  it.skip("correctly selects the same host if the filter applies and the host is in the RR users", async () => {
    const hosts = [
      { isFixed: false as const, createdAt: new Date(), user: { id: 1, email: "example1@acme.com" } },
      { isFixed: false as const, createdAt: new Date(), user: { id: 2, email: "example2@acme.com" } },
    ];

    vi.mocked(routingUtils.isRerouting).mockReturnValue(false);

    vi.mock(
      "@calcom/prisma",
      () => {
        return {
          prisma: {
            booking: {
              findFirst: vi.fn().mockResolvedValue({ userId: 1 }),
            },
          },
        };
      },
      { virtual: true }
    );

    const result = await filterHostsBySameRoundRobinHost({
      hosts,
      rescheduleUid: "some-uid",
      rescheduleWithSameRoundRobinHost: true,
      routedTeamMemberIds: null,
    });

    expect(result).toStrictEqual([hosts[0]]);
  });
});
