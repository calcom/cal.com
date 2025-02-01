import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";

const paramsSchema = z.object({
  slug: z.string(),
  pages: z.array(z.string()),
});

export async function getServerSideProps(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<any>> {
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return {
      notFound: true,
    };
  }

  const appName = parsedParams.data.slug;
  const pages = parsedParams.data.pages;

  // Redirect to the actual page using Next.js routing
  return {
    redirect: {
      destination: `/${appName}/${pages.join("/")}`,
      permanent: false,
    },
  };
}
