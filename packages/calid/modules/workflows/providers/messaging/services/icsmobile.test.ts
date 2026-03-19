import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockPost, mockAxiosCreate, mockIsAxiosError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockAxiosCreate: vi.fn(),
  mockIsAxiosError: vi.fn(),
}));

vi.mock("axios", () => {
  mockAxiosCreate.mockReturnValue({ post: mockPost });
  mockIsAxiosError.mockReturnValue(false);

  return {
    default: {
      create: mockAxiosCreate,
      isAxiosError: mockIsAxiosError,
    },
    create: mockAxiosCreate,
    isAxiosError: mockIsAxiosError,
  };
});

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-otp"),
  compare: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkSMSRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findFirst: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    otpVerification: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import prisma from "@calcom/prisma";

import { IcsMobileSmsProvider } from "./icsmobile";

describe("IcsMobileSmsProvider auth and routing", () => {
  const provider = new IcsMobileSmsProvider({
    authKey: "dom-auth",
    otpAuthKey: "otp-auth",
    intlAuthKey: "intl-auth",
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockPost.mockResolvedValue({
      data: [{ smsgid: "msg-1", to: "919876543210", from: "CALID" }],
    });

    (prisma.team.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.membership.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.otpVerification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.otpVerification.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.otpVerification.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 100 });
    (prisma.otpVerification.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 100 });
  });

  test("uses ICSMOBILE_OTP_AUTH for domestic OTP", async () => {
    await provider.sendVerificationCode({ phoneNumber: "+919876543210" });

    expect(mockPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        smstosend: [
          expect.objectContaining({
            to: "919876543210",
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Basic otp-auth" }),
      })
    );
  });

  test("uses ICSMOBILE_DOM_AUTH for domestic transactional SMS", async () => {
    await provider.sendSms({ to: "9876543210", message: "Hello" });

    expect(mockPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        smstosend: [
          expect.objectContaining({
            to: "919876543210",
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Basic dom-auth" }),
      })
    );
  });

  test("uses ICSMOBILE_INTL_AUTH for international OTP", async () => {
    mockPost.mockResolvedValue({
      data: [{ smsgid: "msg-2", to: "14155552671", from: "CALID" }],
    });

    await provider.sendVerificationCode({ phoneNumber: "+1 415-555-2671" });

    expect(mockPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        smstosend: [
          expect.objectContaining({
            to: "14155552671",
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Basic intl-auth" }),
      })
    );
  });

  test("uses ICSMOBILE_INTL_AUTH for international transactional SMS", async () => {
    mockPost.mockResolvedValue({
      data: [{ smsgid: "msg-3", to: "14155552671", from: "CALID" }],
    });

    await provider.sendSms({ to: "+1 415-555-2671", message: "Hello" });

    expect(mockPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        smstosend: [
          expect.objectContaining({
            to: "14155552671",
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Basic intl-auth" }),
      })
    );
  });

  test.each([
    { input: "+91 98765-43210", expected: "919876543210" },
    { input: "91 98765 43210", expected: "919876543210" },
    { input: "9876543210", expected: "919876543210" },
  ])("normalizes domestic number format for $input", async ({ input, expected }) => {
    await provider.sendSms({ to: input, message: "Hello" });

    expect(mockPost).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        smstosend: [
          expect.objectContaining({
            to: expected,
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Basic dom-auth" }),
      })
    );
  });
});
