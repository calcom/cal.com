"use client";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import Custom404Page from "@components/pages/404";

export { getStaticProps } from "@lib/404/getStaticProps";

const Custom404 = Custom404Page as CalPageWrapper;
Custom404.PageWrapper = PageWrapper;

export default Custom404;
