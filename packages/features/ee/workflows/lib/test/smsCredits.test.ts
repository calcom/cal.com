import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, test, expect } from "vitest";

import dayjs from "@calcom/dayjs";
import { SmsCreditAllocationType } from "@calcom/prisma/enums";

import { addCredits } from "../reminders/providers/twilioProvider";

interface SmsCreditCountWithTeam {
  id: number;
  limitReachedAt: Date | null;
  warningSentAt: Date | null;
  credits: number;
  userId: number | null;
  teamId: number;
  team: {
    name: string;
    members: Array<{
      accepted: boolean;
    }>;
  };
}

describe("SMS credit limits", () => {
  test.skip("should return null if no team has available credits for the user", async ({}) => {
    prismaMock.membership.findMany.mockResolvedValue([]);

    const result = await addCredits("+15555551234", 1, null);

    expect(result).toBe(null);
  });

  test("should return teamId if user is member of a team that has available credits", async () => {
    prismaMock.membership.findMany.mockResolvedValue([
      {
        team: {
          id: 1,
          smsCreditAllocationType: SmsCreditAllocationType.ALL,
          smsCreditAllocationValue: 0,
          smsCreditCounts: [
            {
              credits: 6,
            },
          ],
        },
      },
      {
        team: {
          id: 2,
          smsCreditAllocationType: SmsCreditAllocationType.ALL,
          smsCreditAllocationValue: 0,
          smsCreditCounts: [
            {
              credits: 2,
            },
          ],
        },
      },
      {
        team: {
          id: 2,
          smsCreditAllocationType: SmsCreditAllocationType.ALL,
          smsCreditAllocationValue: 0,
          smsCreditCounts: [
            {
              credits: 10,
            },
          ],
        },
      },
    ]);

    prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.smsCreditCount.update.mockResolvedValue({
      id: 1,
      credits: 6,
      limitReachedAt: null,
      warningSentAt: null,
      userId: 1,
      teamId: 2,
      team: {
        name: "test",
        members: [
          {
            accepted: true,
          },
        ],
      },
    } as SmsCreditCountWithTeam);

    const result = await addCredits("+15555551234", 1, null);

    expect(result).toEqual({ teamId: 2 });
  });

  test("should send 'limit almost reached' email when 80% of credits are used", async () => {
    prismaMock.membership.findMany.mockResolvedValue([
      {
        team: {
          id: 1,
          smsCreditAllocationType: SmsCreditAllocationType.ALL,
          smsCreditAllocationValue: 0,
          smsCreditCounts: [
            {
              credits: 6,
            },
          ],
        },
      },
    ]);

    prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.smsCreditCount.update.mockResolvedValue({
      id: 1,
      credits: 470,
      limitReachedAt: null,
      warningSentAt: dayjs().subtract(3, "month").toDate(),
      userId: null,
      teamId: 1,
      team: {
        name: "test",
        members: [
          {
            accepted: true,
          },
          {
            accepted: true,
          },
        ],
      },
    } as SmsCreditCountWithTeam);

    const result = await addCredits("+15555551234", null, 1);

    expect(result).toEqual({ teamId: 1 });

    //test that the email was sent
  });

  test("should not send 'limit almost reached' email when 80% of credits are used but email was already sent", async () => {
    prismaMock.membership.findMany.mockResolvedValue([
      {
        team: {
          id: 1,
          smsCreditAllocationType: SmsCreditAllocationType.ALL,
          smsCreditAllocationValue: 0,
          smsCreditCounts: [
            {
              credits: 6,
            },
          ],
        },
      },
    ]);
    //we need to fake the date here otherwise this will be flaky at the beginning of the month
    prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.smsCreditCount.update.mockResolvedValue({
      id: 1,
      credits: 470,
      limitReachedAt: null,
      warningSentAt: dayjs().subtract(1, "days").toDate(),
      userId: null,
      teamId: 1,
      team: {
        name: "test",
        members: [
          {
            accepted: true,
          },
          {
            accepted: true,
          },
        ],
      },
    } as SmsCreditCountWithTeam);

    const result = await addCredits("+15555551234", null, 1);

    expect(result).toEqual({ teamId: 1 });

    //test that the email was not
  });
});
