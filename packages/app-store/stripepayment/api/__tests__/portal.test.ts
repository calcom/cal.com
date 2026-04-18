import { WEBAPP_URL } from "@calcom/lib/constants";
import type { NextApiRequest } from "next";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BillingPortalServiceFactory,
  TeamBillingPortalService,
  UserBillingPortalService,
} from "../../lib/BillingPortalService";
import * as customerModule from "../../lib/customer";
import { buildReturnUrl, validateAuthentication } from "../portal";

// Mock dependencies
vi.mock("../../lib/customer");
vi.mock("../../lib/server");
vi.mock("../../lib/subscriptions");
vi.mock("@calcom/prisma", () => ({
  default: {},
}));

const mockCustomerModule = vi.mocked(customerModule);

interface RequestWithSession extends NextApiRequest {
  session?: Session | null;
}

describe("Portal API - Service-Based Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateAuthentication", () => {
    it("should return user when session exists", () => {
      const req = {
        session: {
          user: { id: 123 },
          hasValidLicense: true,
          upId: "test-upid",
          expires: "2024-12-31T23:59:59.999Z",
        } as Session,
      } as RequestWithSession;

      const result = validateAuthentication(req as NextApiRequest);

      expect(result).toEqual({ id: 123 });
    });

    it("should return null when session is missing", () => {
      const req = {} as NextApiRequest;

      const result = validateAuthentication(req);

      expect(result).toBeNull();
    });

    it("should return null when user id is missing", () => {
      const req = {
        session: {
          user: {} as any,
          hasValidLicense: true,
          upId: "test-upid",
          expires: "2024-12-31T23:59:59.999Z",
        } as Session,
      } as RequestWithSession;

      const result = validateAuthentication(req as NextApiRequest);

      expect(result).toBeNull();
    });
  });

  describe("buildReturnUrl", () => {
    it("should return default URL when returnTo is not provided", () => {
      const result = buildReturnUrl();

      expect(result).toBe(`${WEBAPP_URL}/settings/billing`);
    });

    it("should return default URL when returnTo is not a string", () => {
      const result = buildReturnUrl(123 as unknown as string);

      expect(result).toBe(`${WEBAPP_URL}/settings/billing`);
    });

    it("should return safe redirect URL when valid returnTo is provided", () => {
      const returnTo = `${WEBAPP_URL}/settings/teams`;

      const result = buildReturnUrl(returnTo);

      expect(result).toBe(`${WEBAPP_URL}/settings/teams`);
    });

    it("should return WEBAPP_URL root when unsafe redirect URL is provided", () => {
      const returnTo = "http://malicious-site.com";

      const result = buildReturnUrl(returnTo);

      expect(result).toBe(`${WEBAPP_URL}/`);
    });
  });

  describe("BillingPortalServiceFactory", () => {
    it("should create UserBillingPortalService", () => {
      const service = BillingPortalServiceFactory.createUserService();

      expect(service).toBeInstanceOf(UserBillingPortalService);
    });
  });

  describe("TeamBillingPortalService", () => {
    it("should return false for checkPermissions (EE feature removed)", async () => {
      const service = new TeamBillingPortalService();
      const result = await service.checkPermissions(123, 456);

      expect(result).toBe(false);
    });
  });

  describe("UserBillingPortalService", () => {
    let service: UserBillingPortalService;

    beforeEach(() => {
      service = new UserBillingPortalService();
      mockCustomerModule.getStripeCustomerIdFromUserId = vi.fn();
    });

    it("should get customer ID for user", async () => {
      mockCustomerModule.getStripeCustomerIdFromUserId.mockResolvedValue("cus_123");

      const result = await service.getCustomerId(123);

      expect(result).toBe("cus_123");
      expect(mockCustomerModule.getStripeCustomerIdFromUserId).toHaveBeenCalledWith(123);
    });
  });
});
