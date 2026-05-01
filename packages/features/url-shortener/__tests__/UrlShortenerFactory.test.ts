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

const mockCheckIfUserHasFeature = vi.fn();
const mockCheckIfTeamHasFeature = vi.fn();
const mockCheckIfFeatureIsEnabledGlobally = vi.fn();
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfUserHasFeature = mockCheckIfUserHasFeature;
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
    mockCheckIfUserHasFeature.mockResolvedValue(false);
    mockCheckIfTeamHasFeature.mockResolvedValue(false);
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);
  });

  describe("global feature flag", () => {
    it("returns SinkShortener when globally enabled (no userId or teamId)", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create();

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfUserHasFeature).not.toHaveBeenCalled();
      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("returns SinkShortener when globally enabled (skips user and team checks)", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create({ userId: 1, teamId: 2 });

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfUserHasFeature).not.toHaveBeenCalled();
      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });
  });

  describe("user feature flag (global off)", () => {
    it("returns SinkShortener when user has sink-shortener flag enabled", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfUserHasFeature.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create({ userId: 1 });

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfUserHasFeature).toHaveBeenCalledWith(1, "sink-shortener");
      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });

    it("skips user check when userId is null", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      await UrlShortenerFactory.create({ userId: null });

      expect(mockCheckIfUserHasFeature).not.toHaveBeenCalled();
    });
  });

  describe("team feature flag (global off, user off)", () => {
    it("returns SinkShortener when team has sink-shortener flag enabled", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfTeamHasFeature.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create({ teamId: 2 });

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(2, "sink-shortener");
    });

    it("falls back to team check when user check fails", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      mockCheckIfUserHasFeature.mockResolvedValue(false);
      mockCheckIfTeamHasFeature.mockResolvedValue(true);

      const provider = await UrlShortenerFactory.create({ userId: 1, teamId: 2 });

      expect(provider).toBeInstanceOf(SinkShortener);
      expect(mockCheckIfUserHasFeature).toHaveBeenCalledWith(1, "sink-shortener");
      expect(mockCheckIfTeamHasFeature).toHaveBeenCalledWith(2, "sink-shortener");
    });

    it("returns DubShortener when both user and team flags are off", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      const provider = await UrlShortenerFactory.create({ userId: 1, teamId: 2 });

      expect(provider).toBeInstanceOf(DubShortener);
    });

    it("skips team check when teamId is null", async () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      await UrlShortenerFactory.create({ teamId: null });

      expect(mockCheckIfTeamHasFeature).not.toHaveBeenCalled();
    });
  });

  describe("Sink env vars not configured", () => {
    it("returns DubShortener without checking any flags", async () => {
      vi.stubEnv("DUB_API_KEY", "dub-test-key");

      const provider = await UrlShortenerFactory.create({ userId: 1, teamId: 2 });

      expect(provider).toBeInstanceOf(DubShortener);
      expect(mockCheckIfUserHasFeature).not.toHaveBeenCalled();
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

      const provider = await UrlShortenerFactory.create({ userId: 1 });

      expect(provider).toBeInstanceOf(DubShortener);
    });
  });
});
