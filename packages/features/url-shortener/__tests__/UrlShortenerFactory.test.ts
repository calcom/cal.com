import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/features/auth/lib/dub", () => ({
  dub: {
    links: {
      createMany: vi.fn(),
    },
  },
}));

const mockCheckIfTeamHasFeature = vi.fn();
const mockCheckIfFeatureIsEnabledGlobally = vi.fn();
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfTeamHasFeature = mockCheckIfTeamHasFeature;
    checkIfFeatureIsEnabledGlobally = mockCheckIfFeatureIsEnabledGlobally;
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
}));

import { DubShortener } from "../providers/DubShortener";
import { NoopShortener } from "../providers/NoopShortener";
import { SinkShortener } from "../providers/SinkShortener";
import { UrlShortenerFactory } from "../UrlShortenerFactory";

describe("UrlShortenerFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("SINK_API_URL", "");
    vi.stubEnv("SINK_API_KEY", "");
    vi.stubEnv("DUB_API_KEY", "");
    mockCheckIfTeamHasFeature.mockResolvedValue(false);
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);
  });

  describe("global feature flag", () => {
    it("returns SinkShortener when globally enabled (no teamId)", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create(null);

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("returns SinkShortener when globally enabled (with teamId, skips team check)", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create(1);

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });
  });

  describe("team feature flag (global off)", () => {
    it("returns SinkShortener when team has sink-shortener flag enabled", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfTeamHasFeature.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create(1);

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(1, "sink-shortener");
    });

    it("returns DubShortener when team flag is off", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      const provider = await UrlShortenerFactory.create(1);

      expect(provider).toBeInstanceOf(DubShortener);
    });

    it("skips team check when teamId is null", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      await UrlShortenerFactory.create(null);

      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("skips team check when teamId is undefined", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      await UrlShortenerFactory.create();

      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });
  });

  describe("Sink env vars not configured", () => {
    it("returns DubShortener without checking any flags", async () => {
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      const provider = await UrlShortenerFactory.create(1);

      expect(provider).toBeInstanceOf(DubShortener);
      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
      expect(mockCheckIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
    });

    it("returns NoopShortener when nothing is configured", async () => {
      const provider = await UrlShortenerFactory.create();

      expect(provider).toBeInstanceOf(NoopShortener);
    });

    it("returns DubShortener when Sink URL is set but key is missing", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      const provider = await UrlShortenerFactory.create(1);

      expect(provider).toBeInstanceOf(DubShortener);
    });
  });
});
