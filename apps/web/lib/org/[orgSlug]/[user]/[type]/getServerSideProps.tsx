import type { GetServerSidePropsContext } from "next";
import z from "zod";

import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import { getServerSideProps as GSSTeamTypePage } from "@lib/team/[slug]/[type]/getServerSideProps";

import { getServerSideProps as GSSUserTypePage } from "@server/lib/[user]/[type]/getServerSideProps";

const paramsSchema = z.object({
  orgSlug: z.string().transform((s) => slugify(s)),
  user: z.string(),
  type: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const requestorIp = getIP(ctx.req as unknown as Request);
  const identifier = `[orgSlug]/[user]/[type]-${piiHasher.hash(requestorIp)}`;
  const rateLimitResponse = await handleRateLimitForNextJs(ctx, identifier);
  if (rateLimitResponse) return rateLimitResponse;

  const { user: teamOrUserSlugOrDynamicGroup, orgSlug, type } = paramsSchema.parse(ctx.params);
  const team = await prisma.team.findFirst({
    where: {
      slug: slugify(teamOrUserSlugOrDynamicGroup),
      parentId: {
        not: null,
      },
      parent: getSlugOrRequestedSlug(orgSlug),
    },
    select: {
      id: true,
    },
  });

  if (team) {
    const params = { slug: teamOrUserSlugOrDynamicGroup, type };
    return GSSTeamTypePage({
      ...ctx,
      params: {
        ...ctx.params,
        ...params,
      },
      query: {
        ...ctx.query,
        ...params,
      },
    });
  }
  const params = { user: teamOrUserSlugOrDynamicGroup, type };
  return GSSUserTypePage({
    ...ctx,
    params: {
      ...ctx.params,
      ...params,
    },
    query: {
      ...ctx.query,
      ...params,
    },
  });
};
