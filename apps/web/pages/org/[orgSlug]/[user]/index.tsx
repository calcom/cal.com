"use client";

import PageWrapper from "@components/PageWrapper";

import type { UserPageProps } from "../../../[user]";
import UserPage from "../../../[user]";
import type { PageProps as TeamPageProps } from "../../../team/[slug]";
import TeamPage from "../../../team/[slug]";

export { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

export type PageProps = UserPageProps | TeamPageProps;

export default function Page(props: PageProps) {
  if ((props as TeamPageProps)?.team) return <TeamPage {...(props as TeamPageProps)} />;
  return <UserPage {...(props as UserPageProps)} />;
}

Page.isBookingPage = true;
Page.PageWrapper = PageWrapper;
