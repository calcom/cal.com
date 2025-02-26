/* eslint-disable @typescript-eslint/no-explicit-any */
import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import type { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { POST } from "../../app/api/plain-hash/route";

// Mock NextResponse
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

// Mock session
vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
  cookies: () => ({ get: () => null }),
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn().mockReturnValue({
    headers: new Headers(),
    cookies: {},
  }),
}));

vi.mock("app/api/apiRouteMiddleware", () => ({
  apiRouteMiddleware: (handler: () => Promise<Response>) => handler,
}));

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));

describe("Plain Integration API", () => {
  beforeAll(() => {
    process.env.PLAIN_CHAT_HMAC_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_PLAIN_CHAT_ID = "test-chat-id";
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const tiers = [
    { tier: "free", teams: [] },
    { tier: "teams", teams: [{ team: { id: 2, metadata: {}, organizationSettings: null } }] },
    {
      tier: "enterprise",
      teams: [{ team: { id: 3, metadata: { isOrganization: true }, organizationSettings: { id: 1 } } }],
    },
  ];

  it.each(tiers)("should return $tier tier", async ({ tier, teams }) => {
    const userData = { id: 1, email: `${tier}@example.com`, name: `${tier} User` };
    (getServerSession as any).mockResolvedValue({ user: userData });
    prismaMock.user.findUnique.mockResolvedValue({ ...userData, teams });

    const data = await (await POST({} as NextRequest, { params: {} })).json();
    expect(data).toMatchObject({ userTier: tier, email: userData.email, fullName: userData.name });
  });

  it("should return 401 when no session exists", async () => {
    (getServerSession as any).mockResolvedValue(null);
    expect((await POST({} as NextRequest, { params: {} })).status).toBe(401);
  });
});
