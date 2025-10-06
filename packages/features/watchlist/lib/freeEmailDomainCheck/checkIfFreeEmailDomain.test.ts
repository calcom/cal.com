import type { Mock } from "vitest";
import { describe, expect, test, vi, afterEach } from "vitest";

import { checkIfFreeEmailDomain } from "./checkIfFreeEmailDomain";

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => {
  return {
    getGlobalBlockingService: vi.fn().mockReturnValue({
      isFreeEmailDomain: vi.fn().mockResolvedValue(false),
    }),
  };
});

describe("checkIfFreeEmailDomain", () => {
  test("If gmail should return true", async () => {
    expect(await checkIfFreeEmailDomain("test@gmail.com")).toBe(true);
  });
  test("If outlook should return true", async () => {
    expect(await checkIfFreeEmailDomain("test@outlook.com")).toBe(true);
  });
  test("If there's no email domain return as if it was a free email domain", async () => {
    expect(await checkIfFreeEmailDomain("test@")).toBe(true);
  });
  test("If free email domain in watchlist, should return true", async () => {
    const { getGlobalBlockingService } = await import("@calcom/features/di/watchlist/containers/watchlist");
    const getGlobalBlockingServiceMock = getGlobalBlockingService as Mock;

    await checkIfFreeEmailDomain("test@freedomain.com");

    expect(getGlobalBlockingServiceMock).toHaveBeenCalled();

    const mockInstance = getGlobalBlockingServiceMock.mock.results.at(-1)?.value;

    expect(mockInstance.isFreeEmailDomain).toHaveBeenCalledWith("freedomain.com");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
