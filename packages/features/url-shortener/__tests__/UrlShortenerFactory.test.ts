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
  });

  it("returns SinkShortener when Sink is configured", () => {
    vi.stubEnv("SINK_API_URL", "https://sink.test.com");
    vi.stubEnv("SINK_API_KEY", "test-key");

    const provider = UrlShortenerFactory.create();

    expect(provider).toBeInstanceOf(SinkShortener);
  });

  it("returns DubShortener when only Dub is configured", () => {
    vi.stubEnv("DUB_API_KEY", "dub-test-key");

    const provider = UrlShortenerFactory.create();

    expect(provider).toBeInstanceOf(DubShortener);
  });

  it("returns NoopShortener when nothing is configured", () => {
    const provider = UrlShortenerFactory.create();

    expect(provider).toBeInstanceOf(NoopShortener);
  });

  it("prioritizes Sink over Dub when both are configured", () => {
    vi.stubEnv("SINK_API_URL", "https://sink.test.com");
    vi.stubEnv("SINK_API_KEY", "test-key");
    vi.stubEnv("DUB_API_KEY", "dub-test-key");

    const provider = UrlShortenerFactory.create();

    expect(provider).toBeInstanceOf(SinkShortener);
  });

  it("returns DubShortener when Sink URL is set but key is missing", () => {
    vi.stubEnv("SINK_API_URL", "https://sink.test.com");
    vi.stubEnv("DUB_API_KEY", "dub-test-key");

    const provider = UrlShortenerFactory.create();

    expect(provider).toBeInstanceOf(DubShortener);
  });
});
