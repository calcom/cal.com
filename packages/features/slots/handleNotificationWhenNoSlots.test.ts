import i18nMock from "@calcom/testing/lib/__mocks__/libServerI18n";
import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import process from "node:process";
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

vi.spyOn(CalcomEmails, "sendOrganizationAdminNoSlotsNotification");

describe("(Orgs) Send admin notifications when a user has no availability", () => {
  beforeAll(() => {
    // Setup env vars
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mocked_token");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "mocked_url");
  });

  beforeEach(() => {
    // Setup mocks
    prismaMock.membership.findMany.mockResolvedValue([
      {
        user: {
          email: "test@test.com",
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

  it("Should send a notification after 2 times if the org has them enabled", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);
    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    // Define event and organization details
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(), // Mocking Dayjs format function
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    // Call the function with teamId
    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();

    // Mock length to be one then recall to trigger email
    mocked.lrange.mockResolvedValueOnce([""]);

    const service2 = getNoSlotsNotificationService();
    await service2.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalled();
  });
  it("Should not send a notification if the org has them disabled", async () => {
    prismaMock.team.findFirst.mockResolvedValueOnce({
      organizationSettings: {
        adminGetsNoSlotsNotification: false,
      },
    });

    // Define event and organization details
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(), // Mocking Dayjs format function
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });
  it("Should only send notifications to admins of the specified teamId", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    // Mock finding team members
    prismaMock.membership.findMany.mockResolvedValue([
      {
        user: {
          email: "correctteam@test.com",
          locale: "en",
        },
      },
    ]);

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

    // Mock Redis to simulate second no-slots occurrence
    mocked.lrange.mockResolvedValueOnce([""]); // This will trigger email sending

    // Call with specific teamId
    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123, // specific teamId
    });

    // Verify that membership query included correct teamId
    expect(prismaMock.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          team: expect.objectContaining({
            id: 123,
          }),
        }),
      })
    );

    // Verify email was sent only once (to the one correct team member)
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledTimes(1);
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: {
          email: "correctteam@test.com",
        },
      })
    );
  });

  it("Should not send notifications when no teamId is provided", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

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

    mocked.lrange.mockResolvedValueOnce([""]);

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      // teamId intentionally omitted
    });

    expect(prismaMock.membership.findMany).not.toHaveBeenCalled();
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("Should not send notifications when no orgDomain is provided", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };

    const orgDetails = {
      currentOrgDomain: null, // No org domain
      isValidOrgDomain: true,
    };

    mocked.lrange.mockResolvedValueOnce([""]);

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123,
    });

    expect(prismaMock.team.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.membership.findMany).not.toHaveBeenCalled();
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("Should not send notifications when Redis environment variables are not set", async () => {
    // Temporarily unset Redis env vars
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;

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
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123,
    });

    expect(prismaMock.team.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.membership.findMany).not.toHaveBeenCalled();
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();

    // Restore env vars
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  });

  it("Should handle multiple admins correctly", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    // Mock multiple team admins
    prismaMock.membership.findMany.mockResolvedValue([
      {
        user: {
          email: "admin1@test.com",
          locale: "en",
        },
      },
      {
        user: {
          email: "admin2@test.com",
          locale: "fr",
        },
      },
    ]);

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

    mocked.lrange.mockResolvedValueOnce([""]);

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123,
    });

    // Verify emails were sent to both admins
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledTimes(2);
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: {
          email: "admin1@test.com",
        },
      })
    );
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: {
          email: "admin2@test.com",
        },
      })
    );
  });

  it("Should not send duplicate notifications within NO_SLOTS_NOTIFICATION_FREQUENCY", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    prismaMock.membership.findMany.mockResolvedValue([
      {
        user: {
          email: "admin@test.com",
          locale: "en",
        },
      },
    ]);

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

    // First notification cycle - simulate having one previous occurrence
    mocked.lrange.mockResolvedValueOnce([""]); // One previous occurrence
    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123,
    });

    // Verify first notification was sent
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledTimes(1);

    // Reset call counts
    vi.clearAllMocks();

    // For the second attempt, simulate having TWO occurrences already in Redis
    // This better simulates the real Redis state after the first notification
    mocked.lrange.mockResolvedValueOnce(["", ""]); // Two occurrences now

    const service2 = getNoSlotsNotificationService();
    await service2.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123,
    });

    // Verify no additional notifications were sent
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();

    // Verify Redis operations
    expect(mocked.lpush).toHaveBeenCalledTimes(1); // Still records the occurrence
  });

  it("Should maintain separate notification frequencies for different event types", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    prismaMock.membership.findMany.mockResolvedValue([
      {
        user: {
          email: "admin@test.com",
          locale: "en",
        },
      },
    ]);

    const baseEventDetails = {
      username: "user1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };

    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    // First event type notification
    mocked.lrange.mockResolvedValueOnce([""]); // Simulate one previous occurrence for first event
    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails: { ...baseEventDetails, eventSlug: "event1" },
      orgDetails,
      teamId: 123,
    });

    // Verify first notification was sent
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledTimes(1);

    // Reset only the email mock, keep Redis mocks
    vi.mocked(CalcomEmails.sendOrganizationAdminNoSlotsNotification).mockClear();

    // For the second event type, also simulate one previous occurrence
    // This needs to be a separate mock since it's a different key in Redis
    mocked.lrange.mockResolvedValueOnce([""]); // Simulate one previous occurrence for second event
    const service2 = getNoSlotsNotificationService();
    await service2.handleNotificationWhenNoSlots({
      eventDetails: { ...baseEventDetails, eventSlug: "event2" },
      orgDetails,
      teamId: 123,
    });

    // Verify second notification was sent (different event type)
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalledTimes(1);

    // Get all lpush calls
    const lpushCalls = mocked.lpush.mock.calls;
    expect(lpushCalls.length).toBe(2);

    // Extract the Redis keys used for each event
    const firstEventKey = lpushCalls[0][0];
    const secondEventKey = lpushCalls[1][0];

    // Verify different keys were used
    expect(firstEventKey).not.toBe(secondEventKey);
    expect(firstEventKey).toContain("event1");
    expect(secondEventKey).toContain("event2");
  });
});
