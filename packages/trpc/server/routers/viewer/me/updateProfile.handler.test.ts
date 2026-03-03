import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    schedule: {
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    secondaryEmail: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    travelSchedule: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    schedule: {
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({
  getPremiumMonthlyPlanPriceId: vi.fn(),
}));

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: vi.fn(() => ({
    getSubscriptions: vi.fn(),
    updateCustomer: vi.fn(),
  })),
}));

vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendChangeOfEmailVerification: vi.fn(),
}));

vi.mock("@calcom/features/ee/teams/lib/queries", () => ({
  updateNewTeamMemberEventTypes: vi.fn(),
}));

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: vi.fn(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@calcom/features/profile/lib/checkUsername", () => ({
  checkUsername: vi.fn(),
}));

const mockHasAnyByUserId = vi.fn();
const mockCreateWithAvailability = vi.fn();
const mockGetDefaultScheduleId = vi.fn();
const mockSetupDefaultSchedule = vi.fn();
const mockUpdateTimeZoneById = vi.fn();

vi.mock("@calcom/features/schedules/repositories/ScheduleRepository", () => ({
  ScheduleRepository: class {
    hasAnyByUserId = mockHasAnyByUserId;
    createWithAvailability = mockCreateWithAvailability;
    getDefaultScheduleId = mockGetDefaultScheduleId;
    setupDefaultSchedule = mockSetupDefaultSchedule;
    updateTimeZoneById = mockUpdateTimeZoneById;
  },
}));

vi.mock("@calcom/lib/hasKeyInMetadata", () => ({
  default: vi.fn(() => false),
}));

vi.mock("@calcom/lib/http-error", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor({ statusCode, message }: { statusCode: number; message: string }) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadAvatar: vi.fn(),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/server/resizeBase64Image", () => ({
  resizeBase64Image: vi.fn(),
}));

vi.mock("@calcom/lib/slugify", () => ({
  default: vi.fn((str: string) => str),
}));

vi.mock("@calcom/lib/validateBookerLayouts", () => ({
  validateBookerLayouts: vi.fn(() => null),
}));

vi.mock("@calcom/prisma/zod-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma/zod-utils")>();
  return {
    ...actual,
  };
});

describe("updateProfileHandler - default schedule creation", () => {
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    schedule: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    secondaryEmail: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    travelSchedule: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
  };

  const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    emailVerified: new Date(),
    name: "Test User",
    timeZone: "America/New_York",
    locale: "en",
    defaultScheduleId: null,
    metadata: {},
    organizationId: null,
    movedToProfileId: null,
    completedOnboarding: false,
    twoFactorEnabled: false,
    identityProvider: "CAL",
    identityProviderId: null,
    bufferTime: 0,
    startTime: 0,
    endTime: 1440,
    selectedCalendars: [],
    availability: [],
    createdDate: new Date(),
    trialEndsAt: null,
    disableImpersonation: false,
    brandColor: "#000000",
    darkBrandColor: "#ffffff",
    bio: "",
    weekStart: "Monday",
    theme: null,
    appTheme: null,
    hideBranding: false,
    allowDynamicBooking: true,
    allowSEOIndexing: true,
    receiveMonthlyDigestEmail: true,
    timeFormat: 12,
    avatarUrl: null,
    requiresBookerEmailVerification: false,
    role: "USER" as const,
    isPlatformManaged: false,
    defaultBookerLayouts: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const prismaMod = await import("@calcom/prisma");
    prisma = prismaMod.prisma as unknown as typeof prisma;
  });

  it("should create a default schedule when completing onboarding with no existing schedules", async () => {
    const mockSchedule = { id: 42 };

    prisma.user.findUnique.mockResolvedValue({ teams: [] });
    mockHasAnyByUserId.mockResolvedValue(false);
    mockCreateWithAvailability.mockResolvedValue(mockSchedule);
    prisma.user.update.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      identityProvider: "CAL",
      identityProviderId: null,
      metadata: {},
      name: "Test User",
      createdDate: new Date(),
      avatarUrl: null,
      locale: "en",
      schedules: [{ id: 42 }],
    });

    const { updateProfileHandler } = await import("./updateProfile.handler");

    await updateProfileHandler({
      ctx: { user: mockUser as never },
      input: { completedOnboarding: true },
    });

    expect(mockHasAnyByUserId).toHaveBeenCalledWith({
      userId: 1,
    });

    expect(mockCreateWithAvailability).toHaveBeenCalledWith({
      userId: 1,
      name: "default_schedule_name",
      timeZone: "America/New_York",
      availability: expect.arrayContaining([
        expect.objectContaining({
          days: expect.any(Array),
          startTime: expect.any(Date),
          endTime: expect.any(Date),
        }),
      ]),
    });
  });

  it("should not create a schedule when completing onboarding if user already has schedules", async () => {
    prisma.user.findUnique.mockResolvedValue({ teams: [] });
    mockHasAnyByUserId.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      identityProvider: "CAL",
      identityProviderId: null,
      metadata: {},
      name: "Test User",
      createdDate: new Date(),
      avatarUrl: null,
      locale: "en",
      schedules: [{ id: 10 }],
    });

    const { updateProfileHandler } = await import("./updateProfile.handler");

    await updateProfileHandler({
      ctx: { user: mockUser as never },
      input: { completedOnboarding: true },
    });

    expect(mockHasAnyByUserId).toHaveBeenCalledWith({
      userId: 1,
    });

    expect(mockCreateWithAvailability).not.toHaveBeenCalled();
  });

  it("should not create a schedule when completedOnboarding is not set", async () => {
    prisma.user.update.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      identityProvider: "CAL",
      identityProviderId: null,
      metadata: {},
      name: "Test User",
      createdDate: new Date(),
      avatarUrl: null,
      locale: "en",
      schedules: [],
    });

    const { updateProfileHandler } = await import("./updateProfile.handler");

    await updateProfileHandler({
      ctx: { user: mockUser as never },
      input: { name: "New Name" },
    });

    expect(mockHasAnyByUserId).not.toHaveBeenCalled();
    expect(mockCreateWithAvailability).not.toHaveBeenCalled();
  });

  it("should use correct default availability data for the schedule", () => {
    const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

    expect(availability.length).toBeGreaterThan(0);
    availability.forEach((slot) => {
      expect(slot.days).toBeDefined();
      expect(slot.startTime).toBeDefined();
      expect(slot.endTime).toBeDefined();
    });

    const allDays = availability.flatMap((a) => a.days);
    expect(allDays).toContain(1);
    expect(allDays).toContain(2);
    expect(allDays).toContain(3);
    expect(allDays).toContain(4);
    expect(allDays).toContain(5);
    expect(allDays).not.toContain(0);
    expect(allDays).not.toContain(6);
  });
});
