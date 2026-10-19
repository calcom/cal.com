import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProfileHandler } from "./updateProfile.handler";

const mocks = vi.hoisted(() => {
  const tx = {
    user: { update: vi.fn() },
    secondaryEmail: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    eventType: { updateMany: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (callback: ((client: typeof tx) => Promise<unknown>) | Promise<unknown>[]) =>
        typeof callback === "function" ? callback(tx) : Promise.all(callback)
      ),
      user: tx.user,
      eventType: tx.eventType,
      secondaryEmail: { ...tx.secondaryEmail, findUnique: vi.fn() },
    },
    sendVerification: vi.fn(),
  };
});

vi.mock("@calcom/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@calcom/prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("@calcom/prisma/zod-utils", () => ({ userMetadata: { parse: () => ({}) } }));
vi.mock("./updateProfile.schema", () => ({ updateUserMetadataAllowedKeys: {} }));
vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({ getPremiumMonthlyPlanPriceId: vi.fn() }));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendChangeOfEmailVerification: mocks.sendVerification,
}));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfFeatureIsEnabledGlobally = async () => true;
  },
}));
vi.mock("@calcom/features/profile/lib/checkUsername", () => ({ checkUsername: vi.fn() }));
vi.mock("@calcom/features/schedules/repositories/ScheduleRepository", () => ({
  ScheduleRepository: vi.fn(),
}));
vi.mock("@calcom/lib/hasKeyInMetadata", () => ({ default: () => false }));
vi.mock("@calcom/lib/http-error", () => ({ HttpError: class extends Error {} }));
vi.mock("@calcom/lib/logger", () => ({ default: { getSubLogger: () => ({ warn: vi.fn() }) } }));
vi.mock("@calcom/lib/server/avatar", () => ({ uploadAvatar: vi.fn() }));
vi.mock("@calcom/i18n/server", () => ({ getTranslation: vi.fn() }));
vi.mock("@calcom/lib/server/resizeBase64Image", () => ({ resizeBase64Image: vi.fn() }));
vi.mock("@calcom/lib/slugify", () => ({ default: vi.fn() }));
vi.mock("@calcom/lib/validateBookerLayouts", () => ({ validateBookerLayouts: () => null }));

const verifiedAt = new Date("2025-01-01");
const ctx = {
  user: { id: 1, email: "old@example.com", emailVerified: verifiedAt, metadata: {}, locale: "en" },
} as Parameters<typeof updateProfileHandler>[0]["ctx"];
const input = () => ({ email: "new@example.com", removePreviousPrimaryEmail: true, secondaryEmails: [] });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.secondaryEmail.findUnique.mockResolvedValue({ id: 10, emailVerified: verifiedAt });
  mocks.tx.user.update.mockResolvedValue({ id: 1, email: "new@example.com", schedules: [] });
  mocks.tx.secondaryEmail.findMany.mockResolvedValue([
    { id: 10, email: "new@example.com", emailVerified: verifiedAt },
  ]);
  mocks.tx.secondaryEmail.deleteMany.mockResolvedValue({ count: 1 });
});

describe("updateProfile email transaction", () => {
  it("saves the primary and detaches/removes its secondary record in one transaction", async () => {
    const result = await updateProfileHandler({ ctx, input: input() });
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.eventType.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.tx.secondaryEmail.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.tx.user.update.mock.calls[0][0].data).not.toHaveProperty("removePreviousPrimaryEmail");
    expect(result.email).toBe("new@example.com");
    expect(mocks.sendVerification).not.toHaveBeenCalled();
  });

  it("does not retarget event types to the old address when it is retained", async () => {
    await updateProfileHandler({ ctx, input: { email: "new@example.com", secondaryEmails: [] } });
    expect(mocks.tx.eventType.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.tx.secondaryEmail.update).toHaveBeenCalledWith({
      where: { id: 10, userId: 1 },
      data: { email: "old@example.com", emailVerified: verifiedAt },
    });
    expect(mocks.tx.secondaryEmail.deleteMany).not.toHaveBeenCalled();
  });

  it("propagates an email-write failure out of the transaction so Prisma can roll back", async () => {
    mocks.tx.secondaryEmail.deleteMany.mockRejectedValueOnce(new Error("write failed"));
    await expect(updateProfileHandler({ ctx, input: input() })).rejects.toThrow("write failed");
    await expect(mocks.prisma.$transaction.mock.results[0].value).rejects.toThrow("write failed");
    expect(mocks.sendVerification).not.toHaveBeenCalled();
  });

  it("keeps the primary and its notification bindings while verification is pending", async () => {
    mocks.prisma.secondaryEmail.findUnique.mockResolvedValue({ id: 10, emailVerified: null });
    mocks.tx.user.update.mockResolvedValue({ id: 1, email: "old@example.com", schedules: [] });
    const result = await updateProfileHandler({ ctx, input: input() });
    expect(mocks.tx.user.update.mock.calls[0][0].data).not.toHaveProperty("email");
    expect(mocks.tx.eventType.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.secondaryEmail.deleteMany).not.toHaveBeenCalled();
    expect(result.email).toBe("old@example.com");
    expect(mocks.sendVerification).toHaveBeenCalledTimes(1);
  });
});
