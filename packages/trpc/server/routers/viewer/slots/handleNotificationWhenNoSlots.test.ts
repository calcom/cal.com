import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { vi, beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { mock } from "vitest-mock-extended";

import dayjs from "@calcom/dayjs";
import { RedisService } from "@calcom/features/redis/RedisService";

import { handleNotificationWhenNoSlots } from "./handleNotificationWhenNoSlots";

vi.mock("@calcom/features/redis/RedisService", () => ({
  RedisService: mock<RedisService>,
}));

// Mock the upstash tokens for this unit
beforeAll(() => {
  process.env.UPSTASH_REDIS_REST_URL = "mocked_url";
  process.env.UPSTASH_REDIS_REST_TOKEN = "mocked_token";
});

afterAll(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleNotificationWhenNoSlots", async () => {
  it("(Happy) It should send a notification to admins", async () => {
    // Setup your input data
    const mockedRedis = vi.mocked(RedisService.prototype);
    const eventDetails = { username: "mocked_username", eventSlug: "mocked_slug", startTime: dayjs() };
    const orgDetails = { currentOrgDomain: "mock_domain", isValidOrgDomain: true };

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    mockedRedis.lrange.mockResolvedValue([]);

    const expiresSpyOn = vi.spyOn(mockedRedis, "expire");

    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });
    // Ensure we set the expiry once

    expect(expiresSpyOn).toHaveBeenCalled();
  });
});
