import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    $queryRaw: queryRawMock,
  },
}));

import getInstallCountPerApp, { _resetCache } from "./getInstallCountPerApp";

beforeEach(() => {
  queryRawMock.mockReset();
  _resetCache();
});

describe("getInstallCountPerApp", () => {
  it("returns a record of appId to installCount", async () => {
    queryRawMock.mockResolvedValue([
      { appId: "google-calendar", installCount: 100 },
      { appId: "zoom", installCount: 50 },
      { appId: "stripe", installCount: 25 },
    ]);

    const result = await getInstallCountPerApp();

    expect(result).toEqual({
      "google-calendar": 100,
      zoom: 50,
      stripe: 25,
    });
  });

  it("returns empty object when no credentials exist", async () => {
    queryRawMock.mockResolvedValue([]);
    expect(await getInstallCountPerApp()).toEqual({});
  });

  it("serves from cache within TTL", async () => {
    queryRawMock.mockResolvedValue([{ appId: "zoom", installCount: 10 }]);

    await getInstallCountPerApp();
    queryRawMock.mockResolvedValue([{ appId: "zoom", installCount: 99 }]);
    const second = await getInstallCountPerApp();

    expect(second).toEqual({ zoom: 10 });
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("refetches after TTL expires", async () => {
    vi.useFakeTimers();
    queryRawMock.mockResolvedValue([{ appId: "zoom", installCount: 10 }]);

    await getInstallCountPerApp();

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    queryRawMock.mockResolvedValue([{ appId: "zoom", installCount: 99 }]);
    const result = await getInstallCountPerApp();

    expect(result).toEqual({ zoom: 99 });
    expect(queryRawMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
