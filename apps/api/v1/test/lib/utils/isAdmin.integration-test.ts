import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect } from "vitest";

import prisma from "@calcom/prisma";

import { isAdminGuard } from "../../../lib/utils/isAdmin";
import { ScopeOfAdmin } from "../../../lib/utils/scopeOfAdmin";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("isAdmin guard", () => {
  it("Returns false when user does not exist in the system", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    req.userId = 0;

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

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(true);
    expect(scope).toBe(ScopeOfAdmin.SystemWide);
  });

  it("Returns org-wide admin when user is set as such", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {},
    });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

    req.userId = adminUser.id;

    const { isAdmin, scope } = await isAdminGuard(req);

    expect(isAdmin).toBe(true);
    expect(scope).toBe(ScopeOfAdmin.OrgOwnerOrAdmin);
  });
});
