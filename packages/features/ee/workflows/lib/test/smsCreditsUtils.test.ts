import i18nMock from "../../../../../../tests/libs/__mocks__/libServerI18n";
import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";

import twilio from "twilio";
import { vi, describe, beforeAll, expect, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { resetTestEmails } from "@calcom/lib/testEmails";
import {
  MembershipRole,
  WorkflowActions,
  WorkflowMethods,
  SmsCreditAllocationType,
} from "@calcom/prisma/enums";
import handler from "@calcom/web/pages/api/twilio/statusCallback";
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

  test("should return isFree false if team has no more free credits", async () => {
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

  describe("SMS limit reached", () => {
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

    test("should cancel scheduled sms and schedule emails when sms limit is reached", async () => {
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

      prismaMock.workflowReminder.findMany.mockResolvedValue([
        {
          workflowStep: {
            action: WorkflowActions.SMS_ATTENDEE,
          },
          id: 1,
          referenceId: "referenceId",
        },
        {
          workflowStep: {
            action: WorkflowActions.SMS_NUMBER,
          },
          id: 2,
          referenceId: "referenceId",
        },
      ]);

      const result = await addCredits("+15555551234", 1, null, mockGetCreditsForNumber);

      expect(result).toEqual({ isFree: true }); //last SMS is still sent for free

      // SMS_NUMBER is canceled but can't be sent as email as we don't have the email
      expect(prismaMock.workflowReminder.update).toHaveBeenCalledTimes(1);

      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          method: WorkflowMethods.EMAIL,
          referenceId: null,
          scheduled: false,
        },
      });
    });
  });
});

vi.mock("twilio");
vi.mock("@calcom/features/ee/workflows/lib/smsCredits/smsCreditsUtils", async () => {
  const actualModule = await vi.importActual("@calcom/features/ee/workflows/lib/smsCredits/smsCreditsUtils");

  return {
    ...actualModule,
    addCredits: vi.fn().mockResolvedValue({ isFree: true }),
  };
});

const dummyPhoneNumber = "+15551234567";

describe("twilio status callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 if Twilio signature is invalid", async () => {
    twilio.validateRequest.mockReturnValue(false);

    const { req, res } = createMockNextJsRequest({
      method: "POST",
      body: { MessageStatus: "delivered" },
      query: {
        teamToCharge: "1",
      },
      headers: { "x-twilio-signature": "invalid_signature" },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res._getData()).toBe("Missing or invalid Twilio signature");
    expect(addCredits).not.toHaveBeenCalled();
  });

  test("should call addCredits for teamToCharge on a valid request for a delivered message", async () => {
    twilio.validateRequest.mockReturnValue(true);

    const { req, res } = createMockNextJsRequest({
      method: "POST",
      body: { MessageStatus: "delivered", To: dummyPhoneNumber },
      query: {
        teamToCharge: "1",
        userId: "2",
      },
      headers: { "x-twilio-signature": "invalid_signature" },
    });

    await handler(req, res);

    expect(addCredits).toHaveBeenCalledWith(dummyPhoneNumber, 1, 2);
  });

  test("should call addCredits for the right teamId if no teamToCharge was given", async () => {
    twilio.validateRequest.mockReturnValue(true);

    // teamId given
    const { req: req1, res: res1 } = createMockNextJsRequest({
      method: "POST",
      body: { MessageStatus: "delivered", To: dummyPhoneNumber },
      query: {
        userId: "1",
        teamId: "1",
      },
      headers: { "x-twilio-signature": "invalid_signature" },
    });

    await handler(req1, res1);

    expect(addCredits).toHaveBeenCalledWith(dummyPhoneNumber, 1, null);

    // teamId not given
    const { req: req2, res: res2 } = createMockNextJsRequest({
      method: "POST",
      body: { MessageStatus: "delivered", To: dummyPhoneNumber },
      query: {
        userId: "1",
        teamId: "",
      },
      headers: { "x-twilio-signature": "invalid_signature" },
    });

    prismaMock.membership.findMany.mockResolvedValue([
      {
        team: {
          id: 10,
          smsCreditAllocationType: SmsCreditAllocationType.ALL,
          smsCreditCounts: [{ credits: 55 }],
        },
      },
      {
        team: {
          id: 11,
          smsCreditAllocationType: SmsCreditAllocationType.NONE,
          smsCreditCounts: [{ credits: 0 }],
        },
      },
      {
        // team has available credits for user and has used less than team 10
        team: {
          id: 12,
          smsCreditAllocationType: SmsCreditAllocationType.SPECIFIC,
          smsCreditAllocationValue: 55,
          smsCreditCounts: [{ credits: 52 }],
        },
      },
      {
        team: {
          id: 13,
          smsCreditAllocationType: SmsCreditAllocationType.SPECIFIC,
          smsCreditAllocationValue: 50,
          smsCreditCounts: [{ credits: 50 }],
        },
      },
    ]);

    await handler(req2, res2);

    expect(addCredits).toHaveBeenCalledWith(dummyPhoneNumber, 12, 1);
  });
});
