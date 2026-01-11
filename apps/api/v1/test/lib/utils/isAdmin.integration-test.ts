import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, beforeAll } from "vitest";

import prisma from "@calcom/prisma";

import { isAdminGuard } from "../../../lib/utils/isAdmin";
import { ScopeOfAdmin } from "../../../lib/utils/scopeOfAdmin";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("isAdmin guard", () => {
  beforeAll(async () => {
    const acmeOrg = await prisma.team.findFirst({
      where: {
        slug: "acme",
        isOrganization: true,
      },
    });

    if (acmeOrg) {
      await prisma.organizationSettings.upsert({
        where: {
          organizationId: acmeOrg.id,
        },
        update: {
          isAdminAPIEnabled: true,
        },
        create: {
          organizationId: acmeOrg.id,
          orgAutoAcceptEmail: "acme.com",
          isAdminAPIEnabled: true,
        },
      });
    }

    const dunderOrg = await prisma.team.findFirst({
      where: {
        slug: "dunder-mifflin",
        isOrganization: true,
      },
    });

    if (dunderOrg) {
      await prisma.organizationSettings.upsert({
        where: {
          organizationId: dunderOrg.id,
        },
        update: {
          isAdminAPIEnabled: false,
        },
        create: {
          organizationId: dunderOrg.id,
          orgAutoAcceptEmail: "dunder-mifflin.com",
          isAdminAPIEnabled: false,
        },
      });
    }
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
});
