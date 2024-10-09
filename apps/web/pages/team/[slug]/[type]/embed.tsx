import { getServerSideProps as _getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

import TypePage, { type PageProps } from "~/team/type-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

const Page = (props: PageProps) => <TypePage {...props} />;

Page.PageWrapper = PageWrapper;

export default Page;
