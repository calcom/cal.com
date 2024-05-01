import i18nMock from "../../../../../../tests/libs/__mocks__/libServerI18n";
import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { vi, describe, it, beforeAll, afterAll, expect, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import * as CalcomEmails from "@calcom/emails";
import { RedisService } from "@calcom/features/redis/RedisService";

import { handleNotificationWhenNoSlots } from "./handleNotificationWhenNoSlots";

vi.mock("@calcom/features/redis/RedisService", () => {
  RedisService.prototype.lrange = vi.fn();
  RedisService.prototype.lpush = vi.fn();
  RedisService.prototype.expire = vi.fn();
  return {
    RedisService,
  };
});

vi.mock("@calcom/features/flags/server/utils", () => {
  // Mock kill switch to be false
  return {
    getFeatureFlag: vi.fn().mockResolvedValue(false),
  };
});

vi.spyOn(CalcomEmails, "sendOrganizationAdminNoSlotsNotification");

describe("handleNotificationWhenNoSlots", () => {
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

    // @ts-expect-error FIXME - also type error in bookingScenario
    i18nMock.getTranslation.mockImplementation(() => {
      return new Promise((resolve) => {
        const identityFn = (key: string) => key;
        resolve(identityFn);
      });
    });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it("Should send a notification if the org has them enabled", async () => {
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);

    mocked.lrange.mockResolvedValueOnce([]);
    mocked.lpush.mockResolvedValueOnce(1);
    mocked.expire.mockResolvedValueOnce(1);

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
    };
    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    // Call the function
    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();

    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });
    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).toHaveBeenCalled();
  });
  it("Should not send a notification if the org has them disabled", async () => {
    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: false,
      },
    });

    // Define event and organization details
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(), // Mocking Dayjs format function
    };
    const orgDetails = {
      currentOrgDomain: "org1",
      isValidOrgDomain: true,
    };

    // Call the function
    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });

    expect(CalcomEmails.sendEmail).not.toHaveBeenCalled();
  });
});
