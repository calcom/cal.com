import type { GetServerSidePropsContext } from "next";
import z from "zod";

import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import PageWrapper from "@components/PageWrapper";

import type { PageProps as UserTypePageProps } from "../../../[user]/[type]";
import UserTypePage, { getServerSideProps as GSSUserTypePage } from "../../../[user]/[type]";
import type { PageProps as TeamTypePageProps } from "../../../team/[slug]/[type]";
import TeamTypePage, { getServerSideProps as GSSTeamTypePage } from "../../../team/[slug]/[type]";

const paramsSchema = z.object({
  orgSlug: z.string().transform((s) => slugify(s)),
  user: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { user: teamOrUserSlug, orgSlug, type } = paramsSchema.parse(ctx.params);
  const team = await prisma.team.findFirst({
    where: {
      slug: teamOrUserSlug,
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
    const params = { slug: teamOrUserSlug, type };
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
  const params = { user: teamOrUserSlug, type };
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

type Props = UserTypePageProps | TeamTypePageProps;

export default function Page(props: Props) {
  if ((props as TeamTypePageProps)?.teamId) return <TeamTypePage {...(props as TeamTypePageProps)} />;
  return <UserTypePage {...(props as UserTypePageProps)} />;
}

Page.PageWrapper = PageWrapper;
Page.isBookingPage = true;
