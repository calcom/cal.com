import { HttpError } from "@calcom/lib/http-error";
import { TRPCError } from "@trpc/server";
import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  wrapGetServerSidePropsWithSentry: (fn: unknown) => fn,
}));

vi.mock("@calcom/features/routing-forms/lib/getRoutedUrl", () => ({
  getRoutedUrl: vi.fn(),
  hasEmbedPath: vi.fn((path: string) => path.includes("/embed")),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("isbot", () => ({
  isbot: vi.fn(() => false),
}));

import { getRoutedUrl } from "@calcom/features/routing-forms/lib/getRoutedUrl";
import { getServerSideProps } from "./getServerSideProps";

function createMockContext(overrides: Partial<GetServerSidePropsContext> = {}): GetServerSidePropsContext {
  return {
    req: {
      url: "/router",
      headers: { "user-agent": "Mozilla/5.0" },
    },
    res: {
      statusCode: 200,
    },
    query: { form: "test-form-id" },
    resolvedUrl: "/router",
    ...overrides,
  } as unknown as GetServerSidePropsContext;
}

describe("router getServerSideProps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 429 status code when getRoutedUrl throws HttpError with statusCode 429", async () => {
    const rateLimitMessage = "Rate limit exceeded. Try again in 30 seconds.";
    vi.mocked(getRoutedUrl).mockRejectedValue(new HttpError({ statusCode: 429, message: rateLimitMessage }));

    const context = createMockContext();
    const result = await getServerSideProps(context);

    expect(context.res.statusCode).toBe(429);
    expect(result).toEqual({
      props: {
        isEmbed: false,
        form: null,
        message: null,
        errorMessage: rateLimitMessage,
      },
    });
  });

  it("should return 429 status code when getRoutedUrl throws TRPCError with TOO_MANY_REQUESTS", async () => {
    const rateLimitMessage = "Too many requests";
    vi.mocked(getRoutedUrl).mockRejectedValue(
      new TRPCError({ code: "TOO_MANY_REQUESTS", message: rateLimitMessage })
    );

    const context = createMockContext();
    const result = await getServerSideProps(context);

    expect(context.res.statusCode).toBe(429);
    expect(result).toEqual({
      props: {
        isEmbed: false,
        form: null,
        message: null,
        errorMessage: rateLimitMessage,
      },
    });
  });

  it("should set isEmbed to true for embed paths when rate limited", async () => {
    vi.mocked(getRoutedUrl).mockRejectedValue(
      new HttpError({ statusCode: 429, message: "Rate limit exceeded" })
    );

    const context = createMockContext({
      req: { url: "/router/embed", headers: { "user-agent": "Mozilla/5.0" } } as never,
    });
    const result = await getServerSideProps(context);

    expect(context.res.statusCode).toBe(429);
    expect(result).toEqual({
      props: {
        isEmbed: true,
        form: null,
        message: null,
        errorMessage: "Rate limit exceeded",
      },
    });
  });

  it("should re-throw non-rate-limit errors", async () => {
    vi.mocked(getRoutedUrl).mockRejectedValue(new Error("Something went wrong"));

    const context = createMockContext();
    await expect(getServerSideProps(context)).rejects.toThrow("Something went wrong");
  });

  it("should re-throw HttpError with non-429 status codes", async () => {
    vi.mocked(getRoutedUrl).mockRejectedValue(
      new HttpError({ statusCode: 500, message: "Internal server error" })
    );

    const context = createMockContext();
    await expect(getServerSideProps(context)).rejects.toThrow("Internal server error");
  });
});
