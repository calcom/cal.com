import type { GetServerSidePropsContext } from "next";

import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import prisma from "@calcom/prisma";

import { getServerSideProps as GSSTeamPage } from "@lib/team/[slug]/getServerSideProps";

import { getServerSideProps as GSSUserPage } from "@server/lib/[user]/getServerSideProps";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const team = await prisma.team.findFirst({
    where: {
      slug: ctx.query.user as string,
      parentId: {
        not: null,
      },
      parent: getSlugOrRequestedSlug(ctx.query.orgSlug as string),
    },
    select: {
      id: true,
    },
  });
  if (team) {
    return GSSTeamPage({
      ...ctx,
      query: {
        slug: ctx.query.user,
        ...(ctx.query.orgRedirection !== undefined && { orgRedirection: ctx.query.orgRedirection }),
      },
    });
  }
  return GSSUserPage({
    ...ctx,
    query: {
      user: ctx.query.user,
      ...(ctx.query.redirect !== undefined && { redirect: ctx.query.redirect }),
      ...(ctx.query.orgRedirection !== undefined && { orgRedirection: ctx.query.orgRedirection }),
    },
  });
};
