import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse, Redirect } from "next";
import { redirect, notFound } from "next/navigation";
import { createMocks } from "node-mocks-http";
import { describe, expect, it, vi } from "vitest";

import withEmbedSsrAppDir from "./WithEmbedSSR";

export type CustomNextApiRequest = NextApiRequest & Request;
export type CustomNextApiResponse = NextApiResponse & Response;

export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

function getServerSidePropsFnGenerator(
  config:
    | { redirectUrl: string }
    | { props: Record<string, unknown> }
    | {
        notFound: true;
      }
) {
  if ("redirectUrl" in config)
    return async () => {
      return {
        redirect: {
          permanent: false,
          destination: config.redirectUrl,
        } satisfies Redirect,
      };
    };

  if ("props" in config)
    return async () => {
      return {
        props: config.props,
      };
    };

  if ("notFound" in config)
    return async () => {
      return {
        notFound: true as const,
      };
    };

  throw new Error("Invalid config");
}

interface ServerSidePropsContext {
  embedRelatedParams?: Record<string, string>;
}

function getServerSidePropsContextArg({ embedRelatedParams = {} }: ServerSidePropsContext) {
  const { req, res } = createMockNextJsRequest();
  return {
    req,
    res,
    query: {
      ...embedRelatedParams,
    },
    resolvedUrl: "/MOCKED_RESOLVED_URL",
  };
}

describe("withEmbedSsrAppDir", () => {
  describe("when gSSP returns redirect", () => {
    describe("when redirect destination is relative", () => {
      it("should redirect with layout and embed params from the current query", async () => {
        const withEmbedGetSsr = withEmbedSsrAppDir(
          getServerSidePropsFnGenerator({
            redirectUrl: "/reschedule",
          })
        );

        await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        ).catch(noop);

        expect(redirect).toHaveBeenCalledWith("/reschedule/embed?layout=week_view&embed=namespace1");
      });

      it("should preserve existing query params in redirect URL", async () => {
        const withEmbedGetSsr = withEmbedSsrAppDir(
          getServerSidePropsFnGenerator({
            redirectUrl: "/reschedule?redirectParam=1",
          })
        );

        await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        ).catch(noop);

        expect(redirect).toHaveBeenCalledWith(
          "/reschedule/embed?redirectParam=1&layout=week_view&embed=namespace1"
        );
      });

      it("should handle empty embed namespace", async () => {
        const withEmbedGetSsr = withEmbedSsrAppDir(
          getServerSidePropsFnGenerator({
            redirectUrl: "/reschedule?redirectParam=1",
          })
        );

        await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "",
            },
          })
        ).catch(noop);

        expect(redirect).toHaveBeenCalledWith("/reschedule/embed?redirectParam=1&layout=week_view&embed=");
      });
    });

    describe("when redirect destination is absolute", () => {
      it("should handle HTTPS URLs", async () => {
        const withEmbedGetSsr = withEmbedSsrAppDir(
          getServerSidePropsFnGenerator({
            redirectUrl: "https://calcom.cal.local/owner",
          })
        );

        await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        ).catch(noop);

        expect(redirect).toHaveBeenCalledWith(
          "https://calcom.cal.local/owner/embed?layout=week_view&embed=namespace1"
        );
      });

      it("should handle HTTP URLs", async () => {
        const withEmbedGetSsr = withEmbedSsrAppDir(
          getServerSidePropsFnGenerator({
            redirectUrl: "http://calcom.cal.local/owner",
          })
        );

        await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        ).catch(noop);

        expect(redirect).toHaveBeenCalledWith(
          "http://calcom.cal.local/owner/embed?layout=week_view&embed=namespace1"
        );
      });

      it("should treat URLs without protocol as relative", async () => {
        const withEmbedGetSsr = withEmbedSsrAppDir(
          getServerSidePropsFnGenerator({
            redirectUrl: "calcom.cal.local/owner",
          })
        );

        await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        ).catch(noop);

        expect(redirect).toHaveBeenCalledWith(
          "/calcom.cal.local/owner/embed?layout=week_view&embed=namespace1"
        );
      });
    });
  });

  describe("when gSSP returns props", () => {
    it("should add isEmbed=true prop", async () => {
      const withEmbedGetSsr = withEmbedSsrAppDir(
        getServerSidePropsFnGenerator({
          props: {
            prop1: "value1",
          },
        })
      );

      const ret = await withEmbedGetSsr(
        getServerSidePropsContextArg({
          embedRelatedParams: {
            layout: "week_view",
            embed: "",
          },
        })
      );

      expect(ret).toEqual({
        prop1: "value1",
        isEmbed: true,
      });
    });
  });

  describe("when gSSP returns notFound", () => {
    it("should throw notFound", async () => {
      const withEmbedGetSsr = withEmbedSsrAppDir(
        getServerSidePropsFnGenerator({
          notFound: true,
        })
      );

      await withEmbedGetSsr(
        getServerSidePropsContextArg({
          embedRelatedParams: {
            layout: "week_view",
            embed: "",
          },
        })
      ).catch(noop);

      expect(notFound).toHaveBeenCalled();
    });
  });
});
