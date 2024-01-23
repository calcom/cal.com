"use client";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import SetupInformation from "@components/pages/apps/[slug]/setup";

SetupInformation.PageWrapper = PageWrapper;

export default SetupInformation;

export { getServerSideProps };
