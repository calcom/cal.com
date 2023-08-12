import type { GetServerSidePropsContext } from "next";
import z from "zod";

const paramsSchema = z
  .object({
    pages: z.array(z.string()),
  })
  .catch({
    pages: [],
  });

export default function RoutingForms() {
  return null;
}

export const getServerSideProps = (context: GetServerSidePropsContext) => {
  const { pages } = paramsSchema.parse(context.params);

  return {
    redirect: {
      destination: `/apps/routing-forms/${pages.length ? pages.join("/") : ""}`,
      permanent: false,
    },
  };
};
