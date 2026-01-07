import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, test, vi, afterEach } from "vitest";

import { buildEventType } from "@calcom/lib/test/builder";

import handler from "../../../pages/api/event-types/_post";
import checkParentEventOwnership from "../../../pages/api/event-types/_utils/checkParentEventOwnership";
import checkTeamEventEditPermission from "../../../pages/api/event-types/_utils/checkTeamEventEditPermission";
import checkUserMembership from "../../../pages/api/event-types/_utils/checkUserMembership";
import ensureOnlyMembersAsHosts from "../../../pages/api/event-types/_utils/ensureOnlyMembersAsHosts";
import { canUserAccessTeamWithRole } from "../../../pages/api/teams/[teamId]/_auth-middleware";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const adminUserId = 1;
const memberUserId = 10;

vi.mock("../../../pages/api/teams/[teamId]/_auth-middleware", () => ({
  canUserAccessTeamWithRole: vi.fn(),
}));

vi.mock("../../../pages/api/event-types/_utils/checkUserMembership", () => ({
  default: vi.fn(),
}));
vi.mock("../../../pages/api/event-types/_utils/checkParentEventOwnership", () => ({
  default: vi.fn(),
}));
vi.mock("../../../pages/api/event-types/_utils/checkTeamEventEditPermission", () => ({
  default: vi.fn(),
}));
vi.mock("../../../pages/api/event-types/_utils/ensureOnlyMembersAsHosts", () => ({
  default: vi.fn(),
}));

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/event-types", () => {
  describe("Errors", () => {
    test("should throw 401 if a non-admin user tries to create an event type with userId", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "Tennis class",
          slug: "tennis-class-{{$guid}}",
          length: 60,
          hidden: true,
          userId: memberUserId,
        },
      });

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData()).message).toBe("ADMIN required for `userId`");
    });
    test("should throw 401 if not system-wide admin and user cannot access teamId with required roles", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "Tennis class",
          slug: "tennis-class-{{$guid}}",
          length: 60,
          hidden: true,
          teamId: 9999,
        },
      });
      req.userId = memberUserId;
      // @ts-expect-error - Return type is wrong
      vi.mocked(canUserAccessTeamWithRole).mockImplementationOnce(async () => false);

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData()).message).toBe("ADMIN required for `teamId`");
    });
    test("should throw 400 if system-wide admin but neither userId nor teamId provided", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "Tennis class",
          slug: "tennis-class-{{$guid}}",
          length: 60,
          hidden: true,
        },
      });
      req.isSystemWideAdmin = true;
      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe("`userId` or `teamId` required");
    });
  });

  describe("Success", () => {
    test("should call checkParentEventOwnership and checkUserMembership if parentId is present", async () => {
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "Tennis class",
          slug: "tennis-class-{{$guid}}",
          length: 60,
          hidden: true,
          userId: memberUserId,
          parentId: 9999,
          teamId: 9999,
        },
      });
      req.isSystemWideAdmin = true;
      req.userId = adminUserId;

      // @ts-expect-error - Return type is wrong
      vi.mocked(canUserAccessTeamWithRole).mockImplementationOnce(async () => false);

      await handler(req, res);
      expect(checkParentEventOwnership).toHaveBeenCalled();
      expect(checkUserMembership).toHaveBeenCalled();
    });

    test("should create event type successfully if all conditions are met", async () => {
      const eventTypeTest = buildEventType();
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          title: "test title",
          slug: "test-slug",
          length: 60,
          hidden: true,
          userId: memberUserId,
          parentId: 9999,
          teamId: 9999,
        },
      });
      req.isSystemWideAdmin = true;
      req.userId = adminUserId;

      // @ts-expect-error - Return type is wrong
      vi.mocked(canUserAccessTeamWithRole).mockImplementationOnce(async () => true);
      vi.mocked(checkParentEventOwnership).mockImplementationOnce(async () => undefined);
      vi.mocked(checkUserMembership).mockImplementationOnce(async () => undefined);
      vi.mocked(checkTeamEventEditPermission).mockImplementationOnce(async () => undefined);
      vi.mocked(ensureOnlyMembersAsHosts).mockImplementationOnce(async () => undefined);

      prismaMock.eventType.create.mockResolvedValue(eventTypeTest);

      await handler(req, res);
      const data = JSON.parse(res._getData());

      expect(prismaMock.eventType.create).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
      expect(data.message).toBe("Event type created successfully");
    });
  });
});
