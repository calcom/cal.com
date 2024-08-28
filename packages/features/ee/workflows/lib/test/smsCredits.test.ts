import i18nMock from "../../../../../../tests/libs/__mocks__/libServerI18n";
import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { vi, describe, beforeAll, expect, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { addCredits } from "@calcom/ee/workflows/lib/reminders/providers/twilioProvider";
import { resetTestEmails } from "@calcom/lib/testEmails";
import { MembershipRole, SmsCreditAllocationType } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

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
      role: MembershipRole;
      user: {
        email: string;
        name: string;
      };
    }>;
  };
}

vi.mock("@calcom/features/flags/server/utils", () => {
  // Mock kill switch to be false
  return {
    getFeatureFlag: vi.fn().mockResolvedValue(false),
  };
});

beforeAll(() => {
  vi.setSystemTime(new Date("2021-06-20T11:59:59Z"));
});

describe("addCredits", () => {
  beforeEach(() => {
    i18nMock.getTranslation.mockImplementation(() => {
      return new Promise((resolve) => {
        const identityFn = (key: string) => key;
        resolve(identityFn);
      });
    });
    resetTestEmails();
  });

  test("should return null if no team has available credits for the user", async ({}) => {
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
        name: "Test Team",
        members: [
          {
            accepted: true,
            role: MembershipRole.OWNER,
            user: {
              email: "owner@example.com",
              name: "Owner name",
            },
          },
        ],
      },
    } as SmsCreditCountWithTeam);

    const result = await addCredits("+15555551234", 1, null);

    expect(result).toEqual({ teamId: 2 });
  });

  describe("SMS limit almost reached", () => {
    test("should send 'limit almost reached' email when 80% of credits are used", async ({ emails }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 650,
        limitReachedAt: null,
        warningSentAt: dayjs().subtract(3, "month").toDate(),
        userId: null,
        teamId: 1,
        team: {
          name: "Test Team",
          members: [
            {
              accepted: true,
              role: MembershipRole.ADMIN,
              user: {
                email: "admin@example.com",
                name: "Admin name",
              },
            },
            {
              accepted: true,
              role: MembershipRole.OWNER,
              user: {
                email: "owner@example.com",
                name: "Owner name",
              },
            },
            {
              accepted: true,
              role: MembershipRole.MEMBER,
              user: {
                email: "member@example.com",
                name: "Member name",
              },
            },
          ],
        },
      } as SmsCreditCountWithTeam);

      const result = await addCredits("+15555551234", null, 1);

      expect(result).toEqual({ teamId: 1 });

      expect(prismaMock.smsCreditCount.update).toHaveBeenCalledWith({
        data: {
          warningSentAt: new Date(),
        },
        where: {
          id: 1,
        },
      });

      const sentEmails = emails.get();

      const areEmailsSentToAdmin = sentEmails?.some(
        (email) => email.to === "admin@example.com" && email.subject === "sms_limit_almost_reached_subject"
      );

      const areEmailsSentToOwner = sentEmails?.some(
        (email) => email.to === "owner@example.com" && email.subject === "sms_limit_almost_reached_subject"
      );

      const areEmailsSentToMember = sentEmails?.some(
        (email) => email.to === "member@example.com" && email.subject === "sms_limit_almost_reached_subject"
      );

      expect(areEmailsSentToAdmin).toBe(true);
      expect(areEmailsSentToOwner).toBe(true);
      expect(areEmailsSentToMember).toBe(false);
    });

    test("should not send 'limit almost reached' email when 80% of credits are used but email was already sent", async ({
      emails,
    }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 230,
        limitReachedAt: null,
        warningSentAt: dayjs().subtract(3, "day").toDate(),
        userId: null,
        teamId: 1,
        team: {
          name: "Test Team",
          members: [
            {
              accepted: true,
              role: MembershipRole.ADMIN,
              user: {
                email: "admin@example.com",
                name: "Admin name",
              },
            },
          ],
        },
      } as SmsCreditCountWithTeam);

      const result = await addCredits("+15555551234", null, 1);

      expect(result).toEqual({ teamId: 1 });

      const sentEmails = emails.get() ?? [];

      const areEmailsSentToAdmin = sentEmails.some((email) => email.to === "admin@example.com");

      expect(areEmailsSentToAdmin).toBe(false);
    });
  });

  describe("SMS limit almost reached", () => {
    test("should send 'limit reached' email when the credit limit is reached", async ({ emails }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 752,
        limitReachedAt: null,
        warningSentAt: dayjs().subtract(3, "day").toDate(),
        userId: null,
        teamId: 1,
        team: {
          name: "Test Team",
          members: [
            {
              accepted: true,
              role: MembershipRole.ADMIN,
              user: {
                email: "admin@example.com",
                name: "Admin name",
              },
            },
            {
              accepted: true,
              role: MembershipRole.OWNER,
              user: {
                email: "owner@example.com",
                name: "Owner name",
              },
            },
            {
              accepted: true,
              role: MembershipRole.MEMBER,
              user: {
                email: "member@example.com",
                name: "Member name",
              },
            },
          ],
        },
      } as SmsCreditCountWithTeam);

      const result = await addCredits("+15555551234", null, 1);

      expect(prismaMock.smsCreditCount.update).toHaveBeenCalledWith({
        data: {
          limitReachedAt: new Date(),
        },
        where: {
          id: 1,
        },
      });

      expect(result).toEqual({ teamId: 1 });

      expect(prismaMock.smsCreditCount.update).toHaveBeenCalledWith({
        data: {
          limitReachedAt: new Date(),
        },
        where: {
          id: 1,
        },
      });

      const sentEmails = emails.get();

      const areEmailsSentToAdmin = sentEmails?.some(
        (email) => email.to === "admin@example.com" && email.subject === "sms_limit_reached_subject"
      );

      const areEmailsSentToOwner = sentEmails?.some(
        (email) => email.to === "owner@example.com" && email.subject === "sms_limit_reached_subject"
      );

      const areEmailsSentToMember = sentEmails?.some(
        (email) => email.to === "member@example.com" && email.subject === "sms_limit_reached_subject"
      );

      expect(areEmailsSentToAdmin).toBe(true);
      expect(areEmailsSentToOwner).toBe(true);
      expect(areEmailsSentToMember).toBe(false);
    });
    test("should not send 'limit reached' email when all credits are used", async ({ emails }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 253,
        limitReachedAt: dayjs().subtract(3, "day").toDate(),
        warningSentAt: dayjs().subtract(10, "day").toDate(),
        userId: null,
        teamId: 1,
        team: {
          name: "Test Team",
          members: [
            {
              accepted: true,
              role: MembershipRole.ADMIN,
              user: {
                email: "admin@example.com",
                name: "Admin name",
              },
            },
          ],
        },
      } as SmsCreditCountWithTeam);

      const result = await addCredits("+15555551234", null, 1);

      expect(result).toEqual(null); // limit was already reached no team has available credits

      const sentEmails = emails.get() ?? [];

      const areEmailsSentToAdmin = sentEmails.some((email) => email.to === "admin@example.com");

      expect(areEmailsSentToAdmin).toBe(false);
    });
  });
});
