"use client";

import { getServerSideProps as _getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import type { PageProps as TeamPageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";
import UserPage from "~/users/views/users-public-view";
import type { PageProps as UserPageProps } from "~/users/views/users-public-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

export type PageProps = UserPageProps | TeamPageProps;

function Page(props: PageProps) {
  if ((props as TeamPageProps)?.team) return <TeamPage {...(props as TeamPageProps)} />;
  return <UserPage {...(props as UserPageProps)} />;
}

Page.PageWrapper = PageWrapper;

export default Page;
