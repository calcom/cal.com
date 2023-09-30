import type { GetStaticPaths, GetStaticProps } from "next";
import { z } from "zod";

import Workflow from "@calcom/features/ee/workflows/pages/workflow";

import PageWrapper from "@components/PageWrapper";
import type { CalPageWrapper } from "@components/PageWrapper";

const querySchema = z.object({
  workflow: z.string(),
});

export const getStaticProps: GetStaticProps = (ctx) => {
  const params = querySchema.safeParse(ctx.params);
  console.log("Built workflow page:", params);
  if (!params.success) return { notFound: true };

  return {
    props: {
      workflow: params.data.workflow,
    },
    revalidate: 10, // seconds
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

const WorkflowsPage = Workflow as CalPageWrapper;
WorkflowsPage.PageWrapper = PageWrapper;

export default WorkflowsPage;
