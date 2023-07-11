import type { GetServerSidePropsContext } from "next";

import prisma from "@calcom/prisma";

import PageWrapper from "@components/PageWrapper";

import type { UserPageProps } from "../../../[user]";
import UserPage, { getServerSideProps as GSSUserPage } from "../../../[user]";
import type { PageProps as TeamPageProps } from "../../../team/[slug]";
import TeamPage, { getServerSideProps as GSSTeamPage } from "../../../team/[slug]";

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
    return GSSTeamPage({ ...ctx, query: { slug: ctx.query.user } });
  }
  return GSSUserPage({ ...ctx, query: { user: ctx.query.user } });
};

type Props = UserPageProps | TeamPageProps;

export default function Page(props: Props) {
  if ((props as TeamPageProps)?.team) return TeamPage(props as TeamPageProps);
  return UserPage(props as UserPageProps);
}

Page.PageWrapper = PageWrapper;
