"use client";

import type { GetStaticPaths } from "next";

import Workflow from "@calcom/features/ee/workflows/pages/workflow";

import { getStaticProps } from "@lib/workflows/[workflow]/getStaticProps";

import PageWrapper from "@components/PageWrapper";
import type { CalPageWrapper } from "@components/PageWrapper";

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

const WorkflowsPage = Workflow as CalPageWrapper;
WorkflowsPage.PageWrapper = PageWrapper;

export default WorkflowsPage;
export { getStaticProps };
