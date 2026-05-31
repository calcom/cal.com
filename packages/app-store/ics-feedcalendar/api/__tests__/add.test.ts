import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

type IcsFeedCalendarApiMocks = {
  mockPrisma: {
    user: {
      findFirstOrThrow: ReturnType<typeof vi.fn>;
    };
    credential: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  mockBuildCalendarService: ReturnType<typeof vi.fn>;
  mockListCalendars: ReturnType<typeof vi.fn>;
};

const { mockPrisma, mockBuildCalendarService, mockListCalendars }: IcsFeedCalendarApiMocks = vi.hoisted(
  () => {
    const mockListCalendars = vi.fn().mockResolvedValue([{ id: "calendar-1" }]);
    const mockBuildCalendarService = vi.fn(() => ({
      listCalendars: mockListCalendars,
    }));
    const mockPrisma = {
      user: {
        findFirstOrThrow: vi.fn(),
      },
      credential: {
        create: vi.fn(),
      },
    };

    return { mockPrisma, mockBuildCalendarService, mockListCalendars };
  }
);

vi.mock("@calcom/lib/crypto", () => ({
  symmetricEncrypt: vi.fn((value: string) => value),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("../../../_utils/getInstalledAppPath", () => ({
  default: vi.fn(() => "/apps/ics-feed"),
}));

vi.mock("../../lib", () => ({
  BuildCalendarService: mockBuildCalendarService,
}));

function createRes(): Pick<NextApiResponse, "status" | "json"> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
}

describe("ics-feedcalendar add API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.user.findFirstOrThrow.mockResolvedValue({
      id: 1,
      email: "person@example.com",
    });
  });

  it("persists skipWriting when the setup form requests a read-only feed", async () => {
    const { default: handler } = await import("../add");
    const req = {
      method: "POST",
      session: {
        user: {
          id: 1,
        },
      },
      body: {
        urls: ["https://example.com/calendar.ics"],
        skipWriting: true,
      },
    } as Partial<NextApiRequest> as NextApiRequest;
    const res = createRes();

    await handler(req, res);

    expect(mockBuildCalendarService).toHaveBeenCalledWith(
      expect.objectContaining({
        key: JSON.stringify({
          urls: ["https://example.com/calendar.ics"],
          skipWriting: true,
        }),
      })
    );
    expect(mockPrisma.credential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: JSON.stringify({
          urls: ["https://example.com/calendar.ics"],
          skipWriting: true,
        }),
      }),
    });
    expect(mockListCalendars).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("defaults skipWriting to true when omitted", async () => {
    const { default: handler } = await import("../add");
    const req = {
      method: "POST",
      session: {
        user: {
          id: 1,
        },
      },
      body: {
        urls: ["https://example.com/calendar.ics"],
      },
    } as Partial<NextApiRequest> as NextApiRequest;
    const res = createRes();

    await handler(req, res);

    const credentialCreateArg = mockPrisma.credential.create.mock.calls[0][0];
    expect(JSON.parse(credentialCreateArg.data.key as string)).toEqual({
      urls: ["https://example.com/calendar.ics"],
      skipWriting: true,
    });
  });
});
