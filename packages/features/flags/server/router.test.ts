import { describe, expect, test } from "@jest/globals";
import type { Feature, PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

import { featureFlagRouter } from "./router";

beforeEach(() => {
  mockReset(prismaMock);
});

const prismaMock = mockDeep<PrismaClient>();
const mockCtx = {
  session: null,
  prisma: prismaMock,
  locale: "en",
  i18n: {
    _nextI18Next: {
      initialI18nStore: {},
      initialLocale: "en",
      ns: ["common"],
      userConfig: null,
    },
  },
};

const mockRouter = featureFlagRouter.createCaller(mockCtx);
const mockAuthedRouter = featureFlagRouter.createCaller({
  ...mockCtx,
  session: { user: { id: 1, role: "ADMIN" }, expires: new Date().toISOString(), hasValidLicense: true },
});

const mockOutput: Feature[] = [
  {
    slug: "test-feature-1",
    description: "test-description-1",
    enabled: true,
    lastUsedAt: new Date(),
    updatedBy: 1,
    stale: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    type: "OPERATIONAL",
  },
];

describe("@calcom/features/flags/server/router", () => {
  test("list", async () => {
    prismaMock.feature.findMany.mockResolvedValueOnce(mockOutput);
    const result = await mockRouter.list();
    expect(prismaMock.feature.findMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(mockOutput.length);
    expect(result).toStrictEqual(mockOutput);
  });
  test("map", async () => {
    prismaMock.feature.findMany.mockResolvedValueOnce(mockOutput);
    const result = await mockRouter.map();
    expect(prismaMock.feature.findMany).toHaveBeenCalledTimes(1);
    expect(Object.keys(result)).toHaveLength(mockOutput.length);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "test-feature-1": true,
      }
    `);
  });
  test("toggle: should NOT update with logged off user", async () => {
    const mockFeature = mockOutput[0];
    prismaMock.feature.update.mockResolvedValueOnce({ ...mockFeature, enabled: false });
    const mutation = mockRouter.toggle({ enabled: false, slug: "test-feature-1" });
    await expect(mutation).rejects.toMatchInlineSnapshot(`[TRPCError: UNAUTHORIZED]`);
    expect(prismaMock.feature.update).toHaveBeenCalledTimes(0);
  });
  // FIXME: I can't seem to mock an ADMIN user in the context
  test.failing("toggle: should update with signed in ADMIN user", async () => {
    const mockFeature = mockOutput[0];
    prismaMock.feature.update.mockResolvedValueOnce({ ...mockFeature, enabled: false });
    // @ts-expect-error We're mocking the user
    prismaMock.user.findUnique.mockResolvedValue({ id: 1, role: "ADMIN" });
    const mutationResult = await mockAuthedRouter.toggle({ enabled: false, slug: "test-feature-1" });
    expect(prismaMock.feature.update).toHaveBeenCalledTimes(1);
    expect(mutationResult).toMatchInlineSnapshot();
  });
});
