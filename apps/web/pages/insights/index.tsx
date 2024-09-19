"use client";

import { getServerSideProps } from "@lib/insights/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/insights/insights-view";
import InsightsPage from "~/insights/insights-view";

const Page = (props: PageProps) => <InsightsPage {...props} />;
Page.PageWrapper = PageWrapper;
export default Page;
export { getServerSideProps };
