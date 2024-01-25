"use client";

import PageWrapper from "@components/PageWrapper";

import type { PageProps as UserTypePageProps } from "../../../[user]/[type]";
import UserTypePage from "../../../[user]/[type]";
import type { PageProps as TeamTypePageProps } from "../../../team/[slug]/[type]";
import TeamTypePage from "../../../team/[slug]/[type]";

export { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

export type PageProps = UserTypePageProps | TeamTypePageProps;

export default function Page(props: PageProps) {
  if ((props as TeamTypePageProps)?.teamId) return <TeamTypePage {...(props as TeamTypePageProps)} />;
  return <UserTypePage {...(props as UserTypePageProps)} />;
}

Page.PageWrapper = PageWrapper;
Page.isBookingPage = true;
