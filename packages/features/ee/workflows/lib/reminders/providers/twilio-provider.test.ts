import { SMSLockState } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockMessagesCreate, mockTeamFindUnique } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
  mockTeamFindUnique: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findUnique: mockTeamFindUnique,
    },
  },
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: Object.assign(
      vi.fn(() => ({
        update: vi.fn().mockResolvedValue({}),
      })),
      { create: (...args: unknown[]) => mockMessagesCreate(...args) }
    ),
  })),
}));

vi.mock("@calcom/lib/smsLockState", () => ({
  checkSMSRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/testSMS", () => ({
  setTestSMS: vi.fn(),
}));

const baseTwilioEnv = () => {
  vi.stubEnv("TWILIO_SID", "AC_test_sid");
  vi.stubEnv("TWILIO_TOKEN", "test_token");
  vi.stubEnv("TWILIO_MESSAGING_SID", "MG_test_messaging");
  vi.stubEnv("TWILIO_PHONE_NUMBER", "+15550001111");
  vi.stubEnv("TWILIO_WHATSAPP_PHONE_NUMBER", "15550002222");
};

const scheduleArgs = {
  phoneNumber: "+15551234567",
  body: "Workflow reminder body",
  sender: "CalCom",
  bookingUid: "booking-uid-1",
  userId: null as number | null,
  teamId: 1,
};

describe("twilioProvider", () => {
  let sendSMS: typeof import("./twilioProvider")["sendSMS"];
  let scheduleSMS: typeof import("./twilioProvider")["scheduleSMS"];

  beforeAll(async () => {
    delete process.env.NEXT_PUBLIC_IS_E2E;
    delete process.env.INTEGRATION_TEST_MODE;
    delete process.env.IS_E2E;
    vi.resetModules();
    const mod = await import("./twilioProvider");
    sendSMS = mod.sendSMS;
    scheduleSMS = mod.scheduleSMS;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    baseTwilioEnv();
    mockTeamFindUnique.mockResolvedValue({
      smsLockState: SMSLockState.UNLOCKED,
      smsLockReviewedByAdmin: false,
    });
    mockMessagesCreate.mockResolvedValue({ sid: "SM_test_sid_1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_IS_E2E;
    delete process.env.INTEGRATION_TEST_MODE;
    delete process.env.IS_E2E;
  });

  describe("sendSMS", () => {
    it("creates an immediate message without scheduleType when team is not locked", async () => {
      const result = await sendSMS({
        phoneNumber: scheduleArgs.phoneNumber,
        body: scheduleArgs.body,
        sender: scheduleArgs.sender,
        bookingUid: scheduleArgs.bookingUid,
        userId: null,
        teamId: 1,
      });

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const payload = mockMessagesCreate.mock.calls[0][0];
      expect(payload).toEqual(
        expect.objectContaining({
          body: scheduleArgs.body,
          to: scheduleArgs.phoneNumber,
          from: scheduleArgs.sender,
          messagingServiceSid: "MG_test_messaging",
        })
      );
      expect(payload.scheduleType).toBeUndefined();
      expect(payload.sendAt).toBeUndefined();
      expect(result?.sid).toBe("SM_test_sid_1");
    });

    it("does not call Twilio when SMS is locked for team", async () => {
      mockTeamFindUnique.mockResolvedValue({
        smsLockState: SMSLockState.LOCKED,
        smsLockReviewedByAdmin: false,
      });

      const result = await sendSMS({
        phoneNumber: scheduleArgs.phoneNumber,
        body: scheduleArgs.body,
        sender: scheduleArgs.sender,
        userId: null,
        teamId: 1,
      });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe("scheduleSMS", () => {
    it("uses Twilio schedule API when sendAt is beyond minimum window plus leeway", async () => {
      const scheduledDate = new Date(Date.now() + 60 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
      });

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const payload = mockMessagesCreate.mock.calls[0][0];
      expect(payload).toEqual(
        expect.objectContaining({
          scheduleType: "fixed",
          sendAt: scheduledDate,
          body: scheduleArgs.body,
          to: scheduleArgs.phoneNumber,
        })
      );
      expect(result?.sid).toBe("SM_test_sid_1");
    });

    it("sends immediately without scheduleType when sendAt is inside Twilio minimum window", async () => {
      const scheduledDate = new Date(Date.now() + 2 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
      });

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const payload = mockMessagesCreate.mock.calls[0][0];
      expect(payload.scheduleType).toBeUndefined();
      expect(payload.sendAt).toBeUndefined();
      expect(payload).toEqual(
        expect.objectContaining({
          body: scheduleArgs.body,
          to: scheduleArgs.phoneNumber,
        })
      );
      expect(result?.sid).toBe("SM_test_sid_1");
    });

    it("sends immediately when scheduledDate is slightly in the past", async () => {
      const scheduledDate = new Date(Date.now() - 2 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
      });

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const payload = mockMessagesCreate.mock.calls[0][0];
      expect(payload.scheduleType).toBeUndefined();
      expect(result?.sid).toBe("SM_test_sid_1");
    });

    it("does not send when scheduledDate is too far in the past", async () => {
      const scheduledDate = new Date(Date.now() - 10 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
      });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("does not call Twilio when sendAt exceeds 35-day maximum", async () => {
      const scheduledDate = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
      });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("does not call Twilio when team is locked", async () => {
      mockTeamFindUnique.mockResolvedValue({
        smsLockState: SMSLockState.LOCKED,
        smsLockReviewedByAdmin: false,
      });

      const scheduledDate = new Date(Date.now() + 60 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
      });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("schedules WhatsApp with fixed sendAt when far enough in the future", async () => {
      const scheduledDate = new Date(Date.now() + 60 * 60 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
        isWhatsapp: true,
        contentSid: "HX_content_sid",
        contentVariables: { "1": "value" },
      });

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const payload = mockMessagesCreate.mock.calls[0][0];
      expect(payload).toEqual(
        expect.objectContaining({
          scheduleType: "fixed",
          sendAt: scheduledDate,
          contentSid: "HX_content_sid",
          messagingServiceSid: "MG_test_messaging",
        })
      );
      expect(payload.body).toBeUndefined();
      expect(result?.sid).toBe("SM_test_sid_1");
    });

    it("sends WhatsApp immediately when sendAt is too soon for scheduling", async () => {
      const scheduledDate = new Date(Date.now() + 90 * 1000);

      const result = await scheduleSMS({
        ...scheduleArgs,
        scheduledDate,
        isWhatsapp: true,
        contentSid: "HX_content_sid",
        contentVariables: { "1": "value" },
      });

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      const payload = mockMessagesCreate.mock.calls[0][0];
      expect(payload.scheduleType).toBeUndefined();
      expect(payload.sendAt).toBeUndefined();
      expect(payload).toEqual(
        expect.objectContaining({
          contentSid: "HX_content_sid",
          contentVariables: JSON.stringify({ "1": "value" }),
        })
      );
      expect(result?.sid).toBe("SM_test_sid_1");
    });
  });
});
