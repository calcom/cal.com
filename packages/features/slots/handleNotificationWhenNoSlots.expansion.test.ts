import i18nMock from "@calcom/testing/lib/__mocks__/libServerI18n";
import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import dayjs from "@calcom/dayjs";
import * as CalcomEmails from "@calcom/emails/organization-email-service";
import { getNoSlotsNotificationService } from "@calcom/features/di/containers/NoSlotsNotification";
import { RedisService } from "@calcom/features/redis/RedisService";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/redis/RedisService", () => {
  const mockedRedis = vi.fn();
  mockedRedis.prototype.lrange = vi.fn();
  mockedRedis.prototype.lpush = vi.fn();
  mockedRedis.prototype.expire = vi.fn();
  return {
    RedisService: mockedRedis,
  };
});

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn(function () {
    return {
      checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
    };
  }),
}));

vi.mock("@calcom/emails/organization-email-service", () => ({
  OrganizationEmailService: vi.fn().mockImplementation(() => ({
    sendOrganizationCreationEmail: vi.fn(),
  })),
  sendOrganizationAdminNoSlotsNotification: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

vi.spyOn(CalcomEmails, "sendOrganizationAdminNoSlotsNotification");

describe("(Orgs) No-slots notification - expanded edge cases", () => {
  beforeAll(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mocked_token");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "mocked_url");
  });

  beforeEach(() => {
    prismaMock.membership.findMany.mockResolvedValue([
      {
        user: {
          email: "admin@test.com",
          locale: "en",
        },
      },
    ]);

    i18nMock.getTranslation.mockImplementation(() => {
      return new Promise((resolve) => {
        const identityFn = (key: string) => key;
        // @ts-expect-error Target allows only 1 element(s) but source may have more.
        resolve(identityFn);
      });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("Should not send notification on the first no-slots occurrence", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    // First occurrence - Redis returns empty list
    mocked.lrange.mockResolvedValueOnce([]);

    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };

    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    // Should NOT send email on first occurrence
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
    // But should record the occurrence in Redis
    expect(mocked.lpush).toHaveBeenCalledTimes(1);
    // Should set expiry on first occurrence
    expect(mocked.expire).toHaveBeenCalledTimes(1);
  });

  it("Should include correct event details in notification email payload", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    prismaMock.team.findUnique.mockResolvedValue({
      slug: "test-team",
    });

    // Second occurrence triggers notification
    mocked.lrange.mockResolvedValueOnce([""]);

    const startTime = dayjs("2024-03-15T10:00:00Z");
    const endTime = dayjs("2024-03-15T18:00:00Z");

    const eventDetails = {
      username: "john-doe",
      eventSlug: "30-min-meeting",
      startTime,
      endTime,
    };

    const orgDetails = {
      currentOrgDomain: "acme-corp",
      isValidOrgDomain: true,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 456 });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user: "john-doe",
        slug: "30-min-meeting",
        startTime: "2024-03-15",
        endTime: "2024-03-15",
        to: { email: "admin@test.com" },
      })
    );
  });

  it("Should handle org settings returning null", async () => {
    prismaMock.team.findFirst.mockResolvedValue(null);

    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };

    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    // Should not send when org settings are null
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("Should handle empty admins list gracefully", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    // Override to return empty admin list
    prismaMock.membership.findMany.mockResolvedValue([]);

    mocked.lrange.mockResolvedValueOnce([""]);

    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };

    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    // No admins = no emails sent
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("Should include visitor timezone and uid in Redis data hash when provided", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    mocked.lrange.mockResolvedValueOnce([]);

    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs("2024-03-15T10:00:00Z"),
      endTime: dayjs("2024-03-15T18:00:00Z"),
      visitorTimezone: "America/New_York",
      visitorUid: "visitor-123",
    };

    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    // Verify Redis lpush was called with data containing visitor info
    expect(mocked.lpush).toHaveBeenCalledTimes(1);
    const pushedData = mocked.lpush.mock.calls[0][1];
    const parsed = JSON.parse(pushedData as string);
    expect(parsed.vTz).toBe("America/New_York");
    expect(parsed.vUuid).toBe("visitor-123");
  });
});
