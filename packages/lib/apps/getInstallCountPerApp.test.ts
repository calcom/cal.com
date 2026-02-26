import { describe, expect, it, vi, beforeEach } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

// Mock next/cache before any imports that use it
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn: () => Promise<unknown>) => fn),
}));

// Mock prisma — $queryRaw is a tagged template literal function
vi.mock("@calcom/prisma", () => ({
  default: {
    $queryRaw: queryRawMock,
  },
}));

import getInstallCountPerApp, { computeInstallCountsFromDB } from "./getInstallCountPerApp";

describe("computeInstallCountsFromDB", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns a record of appId to installCount", async () => {
    queryRawMock.mockResolvedValue([
      { appId: "google-calendar", installCount: 100 },
      { appId: "zoom", installCount: 50 },
      { appId: "stripe", installCount: 25 },
    ]);

    const result = await computeInstallCountsFromDB();

    expect(result).toEqual({
      "google-calendar": 100,
      zoom: 50,
      stripe: 25,
    });
  });

  it("returns empty object when no credentials exist", async () => {
    queryRawMock.mockResolvedValue([]);

    const result = await computeInstallCountsFromDB();

    expect(result).toEqual({});
  });

  it("handles single app result", async () => {
    queryRawMock.mockResolvedValue([{ appId: "cal-video", installCount: 1 }]);

    const result = await computeInstallCountsFromDB();

    expect(result).toEqual({ "cal-video": 1 });
  });
});

describe("getInstallCountPerApp", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns computed install counts through cache layer", async () => {
    queryRawMock.mockResolvedValue([{ appId: "google-calendar", installCount: 10 }]);

    const result = await getInstallCountPerApp();

    expect(result).toEqual({ "google-calendar": 10 });
  });
});
