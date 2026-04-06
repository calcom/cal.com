import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@calcom/lib/ssrfProtection", () => ({
  validateUrlForSSRF: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    user: { findFirstOrThrow: vi.fn() },
    credential: { create: vi.fn() },
  },
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricEncrypt: vi.fn().mockReturnValue("encrypted"),
}));

vi.mock("@calcom/lib/server/defaultHandler", () => ({
  defaultHandler: vi.fn((handlers) => handlers),
}));

vi.mock("@calcom/lib/server/defaultResponder", () => ({
  defaultResponder: vi.fn((fn: Function) => fn),
}));

vi.mock("../caldavcalendar/lib", () => ({
  BuildCalendarService: vi.fn().mockReturnValue({
    listCalendars: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("../exchange2013calendar/lib", () => ({
  BuildCalendarService: vi.fn().mockReturnValue({
    listCalendars: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("../ics-feedcalendar/lib", () => ({
  BuildCalendarService: vi.fn().mockReturnValue({
    listCalendars: vi.fn().mockResolvedValue([{ name: "Cal 1" }, { name: "Cal 2" }]),
  }),
}));

vi.mock("../_utils/getInstalledAppPath", () => ({
  default: vi.fn().mockReturnValue("/apps/installed/calendar"),
}));

vi.mock("../ics-feedcalendar/config.json", () => ({
  default: { type: "ics-feed_calendar", slug: "ics-feed", variant: "calendar" },
}));

import { validateUrlForSSRF } from "@calcom/lib/ssrfProtection";
import prisma from "@calcom/prisma";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

function createReqRes(options: { method?: string; body?: Record<string, unknown> }) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>({
    method: (options.method ?? "POST") as "POST",
    body: options.body,
    session: { user: { id: 1 } },
  });
}

function mockValidUrl() {
  vi.mocked(validateUrlForSSRF).mockResolvedValue({ isValid: true });
}

function mockBlockedUrl(error = "Blocked hostname") {
  vi.mocked(validateUrlForSSRF).mockResolvedValue({ isValid: false, error });
}

const BLOCKED_URLS = [
  ["http://169.254.169.254/latest/meta-data/", "Blocked hostname"],
  ["http://metadata.google.internal/", "Blocked hostname"],
] as const;

const CREDENTIAL_BODY = { username: "u", password: "p" };

describe("Calendar integration SSRF validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Only id and email are selected by the handlers
    vi.mocked(prisma.user.findFirstOrThrow).mockResolvedValue({
      id: 1,
      email: "user@example.com",
    } as Awaited<ReturnType<typeof prisma.user.findFirstOrThrow>>);
  });

  describe("CalDAV", () => {
    let handler: typeof import("../caldavcalendar/api/add").default;

    beforeEach(async () => {
      handler = (await import("../caldavcalendar/api/add")).default;
    });

    it.each(BLOCKED_URLS)("rejects %s", async (url, error) => {
      mockBlockedUrl(error);
      const { req, res } = createReqRes({ body: { ...CREDENTIAL_BODY, url } });
      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({ message: `URL is not allowed: ${error}` });
    });

    it("allows valid CalDAV URLs", async () => {
      mockValidUrl();
      const { req, res } = createReqRes({ body: { ...CREDENTIAL_BODY, url: "https://caldav.icloud.com/" } });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe("Exchange 2013", () => {
    let postHandler: (req: CustomNextApiRequest, res: CustomNextApiResponse) => Promise<void>;

    beforeEach(async () => {
      const mod = await import("../exchange2013calendar/api/add");
      // defaultHandler mock returns the raw handlers map; defaultResponder mock returns the fn as-is
      const handlers = mod.default as unknown as { POST: Promise<{ default: typeof postHandler }> };
      postHandler = (await handlers.POST).default;
    });

    it.each(BLOCKED_URLS)("rejects %s", async (url, error) => {
      mockBlockedUrl(error);
      const { req, res } = createReqRes({ body: { ...CREDENTIAL_BODY, url } });
      await postHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("allows valid Exchange URLs", async () => {
      mockValidUrl();
      const { req, res } = createReqRes({
        body: { ...CREDENTIAL_BODY, url: "https://outlook.office365.com/EWS/Exchange.asmx" },
      });
      await postHandler(req, res);

      expect(res.statusCode).not.toBe(400);
    });
  });

  describe("ICS Feed", () => {
    let handler: typeof import("../ics-feedcalendar/api/add").default;

    beforeEach(async () => {
      handler = (await import("../ics-feedcalendar/api/add")).default;
    });

    it("rejects when any URL in the array is blocked", async () => {
      vi.mocked(validateUrlForSSRF)
        .mockResolvedValueOnce({ isValid: true })
        .mockResolvedValueOnce({ isValid: false, error: "Blocked hostname" });

      const { req, res } = createReqRes({
        body: { urls: ["https://calendar.google.com/basic.ics", "http://169.254.169.254/"] },
      });
      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("validates every URL in the array", async () => {
      mockValidUrl();
      const urls = ["https://cal1.example.com/feed.ics", "https://cal2.example.com/feed.ics"];
      const { req, res } = createReqRes({ body: { urls } });
      await handler(req, res);

      expect(validateUrlForSSRF).toHaveBeenCalledTimes(2);
      expect(validateUrlForSSRF).toHaveBeenCalledWith(urls[0]);
      expect(validateUrlForSSRF).toHaveBeenCalledWith(urls[1]);
      expect(res.statusCode).toBe(200);
    });
  });
});
