import { describe, beforeEach, vi, test, expect } from "vitest";

import { CreditUsageType } from "@calcom/prisma/enums";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@calcom/lib/constants")>("@calcom/lib/constants");
  return {
    ...actual,
    IS_SMS_CREDITS_ENABLED: true,
  };
});

vi.mock("../reminders/providers/twilioProvider", () => ({
  validateWebhookRequest: vi.fn().mockResolvedValue(true),
  getCountryCodeForNumber: vi.fn().mockResolvedValue("US"),
  getMessageInfo: vi.fn().mockResolvedValue({ price: null, numSegments: null }),
}));

const mockChargeCredits = vi.fn().mockResolvedValue({ teamId: 1 });
vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn().mockImplementation(() => ({
    chargeCredits: mockChargeCredits,
    calculateCreditsFromPrice: vi.fn().mockReturnValue(1),
  })),
}));

const mockFindFirst = vi.fn();
vi.mock("@calcom/prisma", () => ({
  default: {
    membership: {
      findFirst: mockFindFirst,
    },
    team: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
  getPublishedOrgIdFromMemberOrTeamId: vi.fn().mockResolvedValue(null),
}));

describe("Twilio Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SMS to US and CA numbers", () => {
    test("should create expense log with 0 credits with a given teamId", async () => {
      const webhookHandler = (await import("../../../../../../apps/web/pages/api/twilio/webhook")).default;

      const mockRequest = {
        method: "POST",
        headers: {
          "x-twilio-signature": "valid-signature",
        },
        query: {
          teamId: "1",
        },
        body: {
          MessageStatus: "delivered",
          To: "+1234567890", // US number
          SmsSid: "SM123",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("SMS to US and CA are free for teams. Credits set to 0");
      expect(mockChargeCredits).toHaveBeenCalledWith({
        teamId: 1,
        bookingUid: undefined,
        smsSid: "SM123",
        credits: 0,
        creditFor: CreditUsageType.SMS,
      });
    });

    test("should create expense log with 0 credits if userId is part of a team", async () => {
      mockFindFirst.mockResolvedValue({ teamId: 1 });
      const webhookHandler = (await import("../../../../../../apps/web/pages/api/twilio/webhook")).default;

      const mockRequest = {
        method: "POST",
        headers: {
          "x-twilio-signature": "valid-signature",
        },
        query: {
          userId: "123",
        },
        body: {
          MessageStatus: "delivered",
          To: "+1234567890", // US number
          SmsSid: "SM123",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("SMS to US and CA are free for teams. Credits set to 0");
      expect(mockChargeCredits).toHaveBeenCalledWith({
        teamId: 1,
        bookingUid: undefined,
        smsSid: "SM123",
        credits: 0,
        creditFor: CreditUsageType.SMS,
      });
    });

    test("should create expense log with null credits if userId is not part of a team", async () => {
      mockFindFirst.mockResolvedValue(null);
      const webhookHandler = (await import("../../../../../../apps/web/pages/api/twilio/webhook")).default;

      const mockRequest = {
        method: "POST",
        headers: {
          "x-twilio-signature": "valid-signature",
        },
        query: {
          userId: "123",
        },
        body: {
          MessageStatus: "delivered",
          To: "+1234567890", // US number
          SmsSid: "SM123",
        },
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      await webhookHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockChargeCredits).toHaveBeenCalledWith({
        userId: 123,
        bookingUid: undefined,
        smsSid: "SM123",
        credits: null,
        creditFor: CreditUsageType.SMS,
        smsSegments: undefined,
        teamId: undefined,
      });
    });
  });
});
