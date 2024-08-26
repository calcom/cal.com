import type { InferGetStaticPropsType } from "next";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import PageWrapper from "@components/PageWrapper";

import SingleAppPage, { getStaticPaths } from "~/apps/[slug]/slug-view";

const Page = (props: InferGetStaticPropsType<typeof getStaticProps>) => <SingleAppPage {...props} />;

Page.PageWrapper = PageWrapper;

export { getStaticProps, getStaticPaths };

export default Page;
