import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

import dayjs from "@calcom/dayjs";
import { RedisService } from "@calcom/features/redis/RedisService";

import { handleNotificationWhenNoSlots } from "./handleNotificationWhenNoSlots";

vi.mock("@calcom/features/redis/RedisService", () => {
  return {
    RedisService: vi.fn().mockImplementation(() => ({
      lrange: vi.fn(),
      lpush: vi.fn(),
      expire: vi.fn(),
    })),
  };
});

describe("handleNotificationWhenNoSlots", () => {
  beforeAll(() => {
    // Setup env vars
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "mocked_token");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "mocked_url");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("Should send a notification if the org has them enabled", async () => {
    // const redisService = mock<RedisService>();
    const redisService = new RedisService();
    const mocked = vi.mocked(redisService);
    // Mocking the return values
    mocked.lrange.mockResolvedValue(["", ""]);
    mocked.lpush.mockResolvedValue(1);
    mocked.expire.mockResolvedValue(1);

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

    const expiresSpy = vi.spyOn(redisService, "expire");

    // Call the function
    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });

    expect(expiresSpy).toHaveBeenCalled();

    mocked.lrange.mockResolvedValue([""]);

    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });
    // We won't call this fn again as the count will have incremented
    expect(expiresSpy).not.toHaveBeenCalled();
  });
});
