import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSdk = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  getVariant: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@trevosdk/browser", () => ({ default: mockSdk }));

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ error: vi.fn(), warn: vi.fn() }) },
}));

async function importTrevo() {
  return await import("./trevo");
}

describe("trevo wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_TREVO_SDK_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("initTrevo", () => {
    it("initializes the SDK with the env API key", async () => {
      const { initTrevo } = await importTrevo();
      initTrevo();
      expect(mockSdk.init).toHaveBeenCalledWith({ apiKey: "test-key" });
    });

    it("no-ops when NEXT_PUBLIC_TREVO_SDK_KEY is unset", async () => {
      vi.stubEnv("NEXT_PUBLIC_TREVO_SDK_KEY", "");
      const { initTrevo } = await importTrevo();
      initTrevo();
      expect(mockSdk.init).not.toHaveBeenCalled();
    });

    it("is idempotent across repeated calls", async () => {
      const { initTrevo } = await importTrevo();
      initTrevo();
      initTrevo();
      expect(mockSdk.init).toHaveBeenCalledTimes(1);
    });

    it("does not mark itself initialized when the SDK throws", async () => {
      mockSdk.init.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, trackTrevoEvent } = await importTrevo();
      initTrevo();
      trackTrevoEvent("event");
      expect(mockSdk.track).not.toHaveBeenCalled();
    });
  });

  describe("identifyTrevoUser", () => {
    it("no-ops before init", async () => {
      const { identifyTrevoUser } = await importTrevo();
      identifyTrevoUser("42");
      expect(mockSdk.identify).not.toHaveBeenCalled();
    });

    it("identifies the user after init", async () => {
      const { initTrevo, identifyTrevoUser } = await importTrevo();
      initTrevo();
      identifyTrevoUser("42");
      expect(mockSdk.identify).toHaveBeenCalledWith("42");
    });

    it("is idempotent for the same user id", async () => {
      const { initTrevo, identifyTrevoUser } = await importTrevo();
      initTrevo();
      identifyTrevoUser("42");
      identifyTrevoUser("42");
      expect(mockSdk.identify).toHaveBeenCalledTimes(1);
    });

    it("swallows and logs SDK errors", async () => {
      mockSdk.identify.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, identifyTrevoUser } = await importTrevo();
      initTrevo();
      expect(() => identifyTrevoUser("42")).not.toThrow();
    });
  });

  describe("getTrevoVariant", () => {
    it('returns "control" before init', async () => {
      const { getTrevoVariant } = await importTrevo();
      expect(getTrevoVariant("checkout-cta-test")).toBe("control");
      expect(mockSdk.getVariant).not.toHaveBeenCalled();
    });

    it("returns the SDK variant after init", async () => {
      mockSdk.getVariant.mockReturnValueOnce("variant-a");
      const { initTrevo, getTrevoVariant } = await importTrevo();
      initTrevo();
      expect(getTrevoVariant("checkout-cta-test")).toBe("variant-a");
      expect(mockSdk.getVariant).toHaveBeenCalledWith("checkout-cta-test");
    });

    it('returns "control" when the SDK throws', async () => {
      mockSdk.getVariant.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, getTrevoVariant } = await importTrevo();
      initTrevo();
      expect(getTrevoVariant("checkout-cta-test")).toBe("control");
    });
  });

  describe("trackTrevoEvent", () => {
    it("no-ops before init", async () => {
      const { trackTrevoEvent } = await importTrevo();
      trackTrevoEvent("purchase_completed");
      expect(mockSdk.track).not.toHaveBeenCalled();
    });

    it("forwards event name and properties after init", async () => {
      const { initTrevo, trackTrevoEvent } = await importTrevo();
      initTrevo();
      trackTrevoEvent("purchase_completed", { value: 49.99, plan: "pro" });
      expect(mockSdk.track).toHaveBeenCalledWith("purchase_completed", { value: 49.99, plan: "pro" });
    });

    it("swallows and logs SDK errors", async () => {
      mockSdk.track.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, trackTrevoEvent } = await importTrevo();
      initTrevo();
      expect(() => trackTrevoEvent("purchase_completed")).not.toThrow();
    });
  });
});
