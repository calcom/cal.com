import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import type { Redis } from "@upstash/redis";
import { vi, beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import { mock } from "vitest-mock-extended";

import dayjs from "@calcom/dayjs";

import { handleNotificationWhenNoSlots } from "./handleNotificationWhenNoSlots";

vi.mock("@upstash/redis", () => {
  const mockedInstance = {
    lrange: vi.fn(),
    lpush: vi.fn(),
    expire: vi.fn(),
  };

  return {
    Redis: vi.fn().mockImplementation(() => mockedInstance),
    fromEnv: vi.fn(() => mockedInstance),
  };
});

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
  vi.resetAllMocks();
});

describe("handleNotificationWhenNoSlots", () => {
  it("(Happy) It should send a notification to admins", async () => {
    // Setup your input data
    const mockedRedis = mock<Redis>;
    const instance = mockedRedis.fromEnv();

    const eventDetails = { username: "mocked_username", eventSlug: "mocked_slug", startTime: dayjs() };
    const orgDetails = { currentOrgDomain: "mock_domain", isValidOrgDomain: true };

    prismaMock.team.findFirst.mockResolvedValue({
      organizationSettings: {
        adminGetsNoSlotsNotification: true,
      },
    });

    mockedRedis.lrange.mockResolvedValue([]);

    await handleNotificationWhenNoSlots({ eventDetails, orgDetails });

    // Ensure we set the expiry once
  });
});
