import { getServerSideProps as _getServerSideProps } from "@lib/team/[slug]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import TeamPage, { type PageProps } from "~/team/team-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

const Page = (props: PageProps) => <TeamPage {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;
