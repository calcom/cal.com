import type { GetServerSidePropsContext } from "next";

import prisma from "@calcom/prisma";

import PageWrapper from "@components/PageWrapper";

import type { PageProps as UserTypePageProps } from "../../../[user]/[type]";
import UserTypePage, { getServerSideProps as GSSUserTypePage } from "../../../[user]/[type]";
import TeamTypePage, { getServerSideProps as GSSTeamTypePage } from "../../../team/[slug]/[type]";
import type { PageProps as TeamTypePageProps } from "../../../team/[slug]/[type]";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const team = await prisma.team.findFirst({
    where: {
      slug: ctx.query.user as string,
      parentId: {
        not: null,
      },
      parent: {
        slug: ctx.query.orgSlug as string,
      },
    },
    select: {
      id: true,
    },
  });
  if (team) {
    const params = { slug: ctx.query.user, type: ctx.query.type };
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
  const params = { user: ctx.query.user, type: ctx.query.type };
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
  if ((props as TeamTypePageProps)?.teamId) return TeamTypePage(props as TeamTypePageProps);
  return UserTypePage(props as UserTypePageProps);
}

Page.PageWrapper = PageWrapper;
