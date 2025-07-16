import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "../../../lib/utils/isAdmin";
import { ScopeOfAdmin } from "../../../lib/utils/scopeOfAdmin";

vi.mock("@calcom/features/pbac/services/permission-check.service");

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("isAdmin guard", () => {
  let mockPermissionCheckService: {
    checkPermission: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);
  });
  it("Returns false when user does not exist in the system", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    req.userId = 0;
    req.user = undefined;

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(false);
    expect(scope).toBe(null);
  });

  it("Returns false when org user is a member", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });

    req.userId = memberUser.id;
    req.user = memberUser;

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(false);
    expect(scope).toBe(null);
  });

  it("Returns system-wide admin when user is marked as such", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@example.com" } });

    req.userId = adminUser.id;
    req.user = adminUser;

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(true);
    expect(scope).toBe(ScopeOfAdmin.SystemWide);
  });

  it("Returns org-wide admin when user is set as such & admin API access is granted", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

    req.userId = adminUser.id;
    req.user = adminUser;

    mockPermissionCheckService.checkPermission.mockResolvedValueOnce(true);

    const { isAdmin, scope } = await isAdminGuard(req);
    expect(isAdmin).toBe(true);
    expect(scope).toBe(ScopeOfAdmin.OrgOwnerOrAdmin);
  });

  it("Returns no admin when user is set as org admin but admin API access is revoked", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-dunder@example.com" } });

    req.userId = adminUser.id;
    req.user = adminUser;

    const { isAdmin } = await isAdminGuard(req);
    expect(isAdmin).toBe(false);
  });

  it("Returns admin when PBAC is enabled and user has organization.adminApi permission", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

    req.userId = adminUser.id;
    req.user = adminUser;

    mockPermissionCheckService.checkPermission.mockResolvedValueOnce(true);

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(true);
    expect(scope).toBe(ScopeOfAdmin.OrgOwnerOrAdmin);
    expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
      userId: adminUser.id,
      teamId: expect.any(Number),
      permission: "organization.adminApi",
      fallbackRoles: ["OWNER", "ADMIN"],
    });
  });

  it("Returns no admin when PBAC is enabled but user lacks organization.adminApi permission", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

    req.userId = adminUser.id;
    req.user = adminUser;

    mockPermissionCheckService.checkPermission.mockResolvedValueOnce(false);

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(false);
    expect(scope).toBe(null);
    expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
      userId: adminUser.id,
      teamId: expect.any(Number),
      permission: "organization.adminApi",
      fallbackRoles: ["OWNER", "ADMIN"],
    });
  });

  it("Returns admin when PBAC is disabled and user has fallback admin role", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

    req.userId = adminUser.id;
    req.user = adminUser;

    mockPermissionCheckService.checkPermission.mockResolvedValueOnce(true);

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(true);
    expect(scope).toBe(ScopeOfAdmin.OrgOwnerOrAdmin);
  });
});
