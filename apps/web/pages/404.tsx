"use client";

import PageWrapper from "@components/PageWrapper";
import Custom404 from "@components/pages/404";

export { getStaticProps } from "@lib/404/getStaticProps";

export default Custom404;
Custom404.PageWrapper = PageWrapper;
