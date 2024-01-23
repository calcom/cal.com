"use client";

import { getServerSideProps } from "@lib/apps/installed/[category]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import InstalledApps from "@components/pages/apps/installed/[category]";

InstalledApps.PageWrapper = PageWrapper;

export { getServerSideProps };
export default InstalledApps;
