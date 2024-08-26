import type { InferGetStaticPropsType } from "next";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import PageWrapper from "@components/PageWrapper";

import CategoryView, { getStaticPaths } from "~/apps/categories/[category]/category-view";

export type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

const Page = (props: PageProps) => <CategoryView {...props} />;
Page.PageWrapper = PageWrapper;

export default Page;

export { getStaticProps, getStaticPaths };
