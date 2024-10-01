import i18nMock from "../../../../../../tests/libs/__mocks__/libServerI18n";
import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { vi, describe, beforeAll, expect, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { resetTestEmails } from "@calcom/lib/testEmails";
import { MembershipRole } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { addCredits, smsCreditCountSelect } from "../smsCredits/smsCreditsUtils";

interface SmsCreditCountWithTeam {
  id: number;
  limitReached: boolean;
  warningSent: boolean;
  credits: number;
  userId: number | null;
  teamId: number;
  month: Date;
  overageCharges: number;
  team: {
    name: string;
    smsOverageLimit: number;
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

vi.mock("@calcom/features/flags/server/utils", async () => {
  return {
    getFeatureFlag: vi.fn().mockResolvedValue(false),
  };
});

const mockGetCreditsForNumber = vi.fn().mockResolvedValue(2);

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

  test("should return isFree true if team has still available free credits", async () => {
    prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.smsCreditCount.update.mockResolvedValue({
      id: 1,
      credits: 6,
      limitReached: false,
      warningSent: false,
      month: dayjs().startOf("month").toDate(),
      userId: 1,
      teamId: 2,
      overageCharges: 0,
      team: {
        name: "Test Team",
        smsOverageLimit: 0,
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

    const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

    expect(prismaMock.smsCreditCount.update).toHaveBeenCalledTimes(1);

    expect(prismaMock.smsCreditCount.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        credits: {
          increment: 2,
        },
      },
      select: smsCreditCountSelect,
    });

    expect(result).toEqual({ isFree: true });
  });

  test("should return isFree false if team has still available free credits", async () => {
    prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
    prismaMock.smsCreditCount.update.mockResolvedValue({
      id: 1,
      credits: 505,
      limitReached: false,
      warningSent: false,
      month: dayjs().startOf("month").toDate(),
      userId: 1,
      teamId: 2,
      overageCharges: 0,
      team: {
        name: "Test Team",
        smsOverageLimit: 20,
        members: [
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

    const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

    expect(prismaMock.smsCreditCount.update).toHaveBeenCalledTimes(1);

    expect(prismaMock.smsCreditCount.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        credits: {
          increment: 2,
        },
      },
      select: smsCreditCountSelect,
    });

    expect(result).toEqual({ isFree: false });
  });

  describe("SMS limit almost reached emails", () => {
    test("should send 'limit almost reached' email to admins when 80% of credits are used", async ({
      emails,
    }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 650,
        limitReached: false,
        warningSent: false,
        month: dayjs().startOf("month").toDate(),
        userId: 1,
        teamId: 2,
        overageCharges: 0,
        team: {
          name: "Test Team",
          smsOverageLimit: 0,
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

      const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

      expect(result).toEqual({ isFree: true });

      expect(prismaMock.smsCreditCount.update).toHaveBeenNthCalledWith(1, {
        where: {
          id: 1,
        },
        data: {
          credits: {
            increment: 2,
          },
        },
        select: smsCreditCountSelect,
      });

      expect(prismaMock.smsCreditCount.update).toHaveBeenNthCalledWith(2, {
        data: {
          warningSent: true,
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

    test("should send 'limit almost reached' email when 80% of the overage limit is used", async ({
      emails,
    }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 770,
        limitReached: false,
        warningSent: false,
        month: dayjs().startOf("month").toDate(),
        userId: 1,
        teamId: 2,
        overageCharges: 81,
        team: {
          name: "Test Team",
          smsOverageLimit: 100,
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

      const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

      expect(result).toEqual({ isFree: false });

      expect(prismaMock.smsCreditCount.update).toHaveBeenNthCalledWith(1, {
        where: {
          id: 1,
        },
        data: {
          credits: {
            increment: 2,
          },
        },
        select: smsCreditCountSelect,
      });

      expect(prismaMock.smsCreditCount.update).toHaveBeenNthCalledWith(2, {
        data: {
          warningSent: true,
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
        limitReached: false,
        warningSent: true,
        month: dayjs().startOf("month").toDate(),
        userId: null,
        teamId: 1,
        overageCharges: 0,
        team: {
          name: "Test Team",
          smsOverageLimit: 0,
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

      const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

      expect(result).toEqual({ isFree: true });

      const sentEmails = emails.get() ?? [];

      const areEmailsSentToAdmin = sentEmails.some((email) => email.to === "admin@example.com");

      expect(areEmailsSentToAdmin).toBe(false);
    });
  });

  describe("SMS limit reached emails", () => {
    test("should send 'limit reached' email when the credit limit is reached", async ({ emails }) => {
      prismaMock.smsCreditCount.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.smsCreditCount.update.mockResolvedValue({
        id: 1,
        credits: 752,
        limitReached: false,
        warningSent: true,
        month: dayjs().startOf("month").toDate(),
        userId: null,
        teamId: 1,
        overageCharges: 0,
        team: {
          smsOverageLimit: 0,
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

      const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

      expect(prismaMock.smsCreditCount.update).toHaveBeenCalledWith({
        data: {
          limitReached: true,
        },
        where: {
          id: 1,
        },
      });

      expect(result).toEqual({ isFree: true }); //last SMS is still sent for free

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
  });
});

// describe("getPayingTeamId", () => {});

// describe("cancelScheduledSmsAndScheduleEmails", () => {});
