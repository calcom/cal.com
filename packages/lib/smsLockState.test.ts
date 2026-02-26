import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./rateLimit", () => {
  const inner = vi.fn();
  return {
    rateLimiter: vi.fn().mockReturnValue(inner),
  };
});

vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@calcom/prisma/enums", () => ({
  SMSLockState: {
    LOCKED: "LOCKED",
    REVIEW_NEEDED: "REVIEW_NEEDED",
  },
}));

import { prisma } from "@calcom/prisma";
import { rateLimiter } from "./rateLimit";
import { checkSMSRateLimit } from "./smsLockState";

// Get the inner function that rateLimiter() returns
const mockRateLimitFn = vi.mocked(rateLimiter)() as unknown as ReturnType<typeof vi.fn>;

describe("checkSMSRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls rateLimiter with provided params", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: true });

    await checkSMSRateLimit({
      identifier: "sms:user:123",
      rateLimitingType: "sms",
    });

    expect(mockRateLimitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "sms:user:123",
        rateLimitingType: "sms",
      })
    );
  });

  it("calls onRateLimiterResponse callback when provided", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: true });
    const callback = vi.fn();

    await checkSMSRateLimit({
      identifier: "sms:user:123",
      onRateLimiterResponse: callback,
    });

    expect(callback).toHaveBeenCalledWith({ success: true });
  });

  it("does not lock when rate limit succeeds", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: true });

    await checkSMSRateLimit({
      identifier: "sms:user:123",
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it("locks user with LOCKED state when sms rate limit fails", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 123,
      smsLockReviewedByAdmin: false,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await checkSMSRateLimit({
      identifier: "sms:user:123",
      rateLimitingType: "sms",
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { smsLockState: "LOCKED" },
      })
    );
  });

  it("locks user with REVIEW_NEEDED state when non-sms rate limit fails", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 123,
      smsLockReviewedByAdmin: false,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await checkSMSRateLimit({
      identifier: "sms:user:123",
      rateLimitingType: "smsMonth",
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { smsLockState: "REVIEW_NEEDED" },
      })
    );
  });
});

describe("changeSMSLockState (tested indirectly)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses user identifier 'sms:user:123' and updates user lock state", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 123,
      smsLockReviewedByAdmin: false,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await checkSMSRateLimit({
      identifier: "sms:user:123",
      rateLimitingType: "sms",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 123 }),
      })
    );
  });

  it("parses team identifier 'sms:team:456' and updates team lock state", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({
      id: 456,
      smsLockReviewedByAdmin: false,
    } as never);
    vi.mocked(prisma.team.update).mockResolvedValueOnce({} as never);

    await checkSMSRateLimit({
      identifier: "sms:team:456",
      rateLimitingType: "sms",
    });

    expect(prisma.team.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 456 }),
      })
    );
    expect(prisma.team.update).toHaveBeenCalled();
  });

  it("skips update if user.smsLockReviewedByAdmin is true", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 123,
      smsLockReviewedByAdmin: true,
    } as never);

    await checkSMSRateLimit({
      identifier: "sms:user:123",
      rateLimitingType: "sms",
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("skips update if team.smsLockReviewedByAdmin is true", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({
      id: 456,
      smsLockReviewedByAdmin: true,
    } as never);

    await checkSMSRateLimit({
      identifier: "sms:team:456",
      rateLimitingType: "sms",
    });

    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it("handles team with parentId: null and isOrganization: false", async () => {
    mockRateLimitFn.mockResolvedValueOnce({ success: false });
    vi.mocked(prisma.team.findUnique).mockResolvedValueOnce({
      id: 789,
      smsLockReviewedByAdmin: false,
      parentId: null,
      isOrganization: false,
    } as never);
    vi.mocked(prisma.team.update).mockResolvedValueOnce({} as never);

    await checkSMSRateLimit({
      identifier: "sms:team:789",
      rateLimitingType: "sms",
    });

    expect(prisma.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          parentId: null,
          isOrganization: false,
        }),
      })
    );
  });
});
