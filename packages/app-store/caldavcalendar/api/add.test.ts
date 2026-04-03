import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuildCalendarService } from "../lib";
import handler from "./add";

const ENCRYPTION_KEY = "12345678901234567890123456789012";

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findFirstOrThrow: vi.fn(),
    },
    credential: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../lib", () => ({
  BuildCalendarService: vi.fn(),
}));

const mockPrisma = prisma as unknown as {
  user: {
    findFirstOrThrow: ReturnType<typeof vi.fn>;
  };
  credential: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const mockBuildCalendarService = BuildCalendarService as unknown as ReturnType<typeof vi.fn>;

type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createMockResponse = (): MockResponse => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return response;
};

describe("caldav add api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CALENDSO_ENCRYPTION_KEY", ENCRYPTION_KEY);

    mockPrisma.user.findFirstOrThrow.mockResolvedValue({
      id: 1,
      email: "team-owner@example.com",
    });

    mockBuildCalendarService.mockReturnValue({
      listCalendars: vi.fn().mockResolvedValue([]),
    });

    mockPrisma.credential.create.mockResolvedValue({ id: 101 });
  });

  it("allows a second credential on the same URL when credentials are different", async () => {
    const sharedUrl = "https://nextcloud.example.com/remote.php/dav";

    mockPrisma.credential.findMany.mockResolvedValue([
      {
        key: symmetricEncrypt(
          JSON.stringify({ username: "user-one", password: "password-one", url: sharedUrl }),
          ENCRYPTION_KEY
        ),
      },
    ]);

    const req = {
      method: "POST",
      body: {
        username: "user-two",
        password: "password-two",
        url: sharedUrl,
      },
      session: {
        user: {
          id: 1,
        },
      },
    } as unknown as NextApiRequest;

    const res = createMockResponse();

    await handler(req, res as unknown as NextApiResponse);

    expect(mockBuildCalendarService).toHaveBeenCalledTimes(1);
    expect(mockPrisma.credential.create).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("treats the exact same URL, username, and password as an idempotent add", async () => {
    const sameCredential = {
      username: "same-user",
      password: "same-password",
      url: "https://nextcloud.example.com/remote.php/dav",
    };

    mockPrisma.credential.findMany.mockResolvedValue([
      {
        key: symmetricEncrypt(JSON.stringify(sameCredential), ENCRYPTION_KEY),
      },
    ]);

    const req = {
      method: "POST",
      body: sameCredential,
      session: {
        user: {
          id: 1,
        },
      },
    } as unknown as NextApiRequest;

    const res = createMockResponse();

    await handler(req, res as unknown as NextApiResponse);

    expect(mockBuildCalendarService).not.toHaveBeenCalled();
    expect(mockPrisma.credential.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
