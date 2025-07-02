import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it, vi, beforeEach } from "vitest";

import handler from "../api/callback";

vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    selectedCalendar: {
      create: vi.fn(),
    },
  },
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

vi.mock("@calcom/lib/connectedCalendar", () => ({
  renewSelectedCalendarCredentialId: vi.fn(),
}));

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: vi.fn().mockResolvedValue({
    client_id: "test-client-id",
    client_secret: "test-client-secret",
  }),
}));

vi.mock("../../_utils/getInstalledAppPath", () => ({
  default: vi.fn().mockReturnValue("/apps/installed/office365-calendar"),
}));

vi.mock("../../_utils/oauth/decodeOAuthState", () => ({
  decodeOAuthState: vi.fn().mockReturnValue({ returnTo: "/apps/installed" }),
}));

vi.mock("@calcom/lib/getSafeRedirectUrl", () => ({
  getSafeRedirectUrl: vi.fn().mockImplementation((url) => url),
}));

vi.mock("@calcom/lib/errors", () => ({
  handleErrorsJson: vi.fn(),
}));

global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    headers: {
      get: vi.fn().mockReturnValue(null),
    },
    json: () => Promise.resolve({}),
  })
);

describe("Office 365 Calendar Callback", () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { handleErrorsJson } = await import("@calcom/lib/errors");
    (handleErrorsJson as any).mockResolvedValue({
      value: [{ id: "calendar-1", isDefaultCalendar: true }],
    });

    req = {
      query: { code: "test-auth-code" },
      session: {
        user: { id: 1 },
        hasValidLicense: true,
        upId: "test-up-id",
        expires: "2025-12-31T23:59:59.999Z",
      },
    };
    res = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("oauth2/v2.0/token")) {
        return Promise.resolve({
          ok: true,
          headers: {
            get: vi.fn().mockReturnValue(null),
          },
          json: () =>
            Promise.resolve({
              access_token: "test-access-token",
              refresh_token: "test-refresh-token",
              expires_in: 3600,
            }),
        });
      }
      if (url.includes("graph.microsoft.com/v1.0/me")) {
        return Promise.resolve({
          ok: true,
          headers: {
            get: vi.fn().mockReturnValue(null),
          },
          json: () =>
            Promise.resolve({
              mail: "test@example.com",
              userPrincipalName: "test@example.com",
            }),
        });
      }
      if (url.includes("graph.microsoft.com/v1.0/me/calendars")) {
        return Promise.resolve({
          ok: true,
          headers: {
            get: vi.fn().mockReturnValue(null),
          },
          json: () =>
            Promise.resolve({
              value: [{ id: "calendar-1", isDefaultCalendar: true }],
            }),
        });
      }
      return Promise.resolve({
        ok: false,
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      });
    });
  });

  it("should handle missing user session", async () => {
    req.session = undefined;

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=user_session_missing"));
  });

  it("should handle missing default calendar", async () => {
    const { handleErrorsJson } = await import("@calcom/lib/errors");
    (handleErrorsJson as any).mockResolvedValue({
      value: [],
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=default_calendar_not_found"));
  });

  it("should handle credential creation failure", async () => {
    const prisma = await import("@calcom/prisma");
    (prisma.default.credential.create as any).mockRejectedValue(new Error("Database error"));

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("error=credential_creation_failed"));
  });
});
