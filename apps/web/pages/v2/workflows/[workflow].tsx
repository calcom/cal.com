import { GetStaticPaths, GetStaticProps } from "next";
import { z } from "zod";

export { default } from "@calcom/features/ee/workflows/pages/v2/workflow";

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
