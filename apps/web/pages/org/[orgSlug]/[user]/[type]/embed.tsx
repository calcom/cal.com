import { getServerSideProps as _getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import type { PageProps as TeamTypePageProps } from "~/team/type-view";
import TeamTypePage from "~/team/type-view";
import UserTypePage from "~/users/views/users-type-public-view";
import type { PageProps as UserTypePageProps } from "~/users/views/users-type-public-view";

export type PageProps = UserTypePageProps | TeamTypePageProps;

export default function Page(props: PageProps) {
  if ((props as TeamTypePageProps)?.teamId) return <TeamTypePage {...(props as TeamTypePageProps)} />;
  return <UserTypePage {...(props as UserTypePageProps)} />;
}

Page.PageWrapper = PageWrapper;

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
