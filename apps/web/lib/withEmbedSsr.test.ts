import type { Request, Response } from "express";
import type { Redirect } from "next";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it } from "vitest";

import withEmbedSsr from "./withEmbedSsr";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
export function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}

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

function getServerSidePropsContextArg({
  embedRelatedParams,
}: {
  embedRelatedParams?: Record<string, string>;
}) {
  return {
    ...createMockNextJsRequest(),
    query: {
      ...embedRelatedParams,
    },
    resolvedUrl: "/MOCKED_RESOLVED_URL",
  };
}

describe("withEmbedSsr", () => {
  describe("when gSSP returns redirect", () => {
    describe("when redirect destination is relative, should add /embed to end of the path", () => {
      it("should add layout and embed params from the current query", async () => {
        const withEmbedGetSsr = withEmbedSsr(
          getServerSidePropsFnGenerator({
            redirectUrl: "/reschedule",
          })
        );

        const ret = await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        );
        expect(ret).toEqual({
          redirect: {
            destination: "/reschedule/embed?layout=week_view&embed=namespace1",
            permanent: false,
          },
        });
      });

      it("should add layout and embed params without losing query params that were in redirect", async () => {
        const withEmbedGetSsr = withEmbedSsr(
          getServerSidePropsFnGenerator({
            redirectUrl: "/reschedule?redirectParam=1",
          })
        );

        const ret = await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        );
        expect(ret).toEqual({
          redirect: {
            destination: "/reschedule/embed?redirectParam=1&layout=week_view&embed=namespace1",
            permanent: false,
          },
        });
      });

      it("should add embed param even when it was empty(i.e. default namespace of embed)", async () => {
        const withEmbedGetSsr = withEmbedSsr(
          getServerSidePropsFnGenerator({
            redirectUrl: "/reschedule?redirectParam=1",
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
          redirect: {
            destination: "/reschedule/embed?redirectParam=1&layout=week_view&embed=",
            permanent: false,
          },
        });
      });
    });

    describe("when redirect destination is absolute, should add /embed to end of the path", () => {
      it("should add layout and embed params from the current query when destination URL is HTTPS", async () => {
        const withEmbedGetSsr = withEmbedSsr(
          getServerSidePropsFnGenerator({
            redirectUrl: "https://calcom.cal.local/owner",
          })
        );

        const ret = await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        );

        expect(ret).toEqual({
          redirect: {
            destination: "https://calcom.cal.local/owner/embed?layout=week_view&embed=namespace1",
            permanent: false,
          },
        });
      });
      it("should add layout and embed params from the current query when destination URL is HTTP", async () => {
        const withEmbedGetSsr = withEmbedSsr(
          getServerSidePropsFnGenerator({
            redirectUrl: "http://calcom.cal.local/owner",
          })
        );

        const ret = await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        );

        expect(ret).toEqual({
          redirect: {
            destination: "http://calcom.cal.local/owner/embed?layout=week_view&embed=namespace1",
            permanent: false,
          },
        });
      });
      it("should correctly identify a URL as non absolute URL if protocol is missing", async () => {
        const withEmbedGetSsr = withEmbedSsr(
          getServerSidePropsFnGenerator({
            redirectUrl: "httpcalcom.cal.local/owner",
          })
        );

        const ret = await withEmbedGetSsr(
          getServerSidePropsContextArg({
            embedRelatedParams: {
              layout: "week_view",
              embed: "namespace1",
            },
          })
        );

        expect(ret).toEqual({
          redirect: {
            // FIXME: Note that it is adding a / in the beginning of the path, which might be fine for now, but could be an issue
            destination: "/httpcalcom.cal.local/owner/embed?layout=week_view&embed=namespace1",
            permanent: false,
          },
        });
      });
    });
  });

  describe("when gSSP returns props", () => {
    it("should add isEmbed=true prop", async () => {
      const withEmbedGetSsr = withEmbedSsr(
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
        props: {
          prop1: "value1",
          isEmbed: true,
        },
      });
    });
  });

  describe("when gSSP doesn't have props or redirect ", () => {
    it("should return the result from gSSP as is", async () => {
      const withEmbedGetSsr = withEmbedSsr(
        getServerSidePropsFnGenerator({
          notFound: true,
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

      expect(ret).toEqual({ notFound: true });
    });
  });
});
