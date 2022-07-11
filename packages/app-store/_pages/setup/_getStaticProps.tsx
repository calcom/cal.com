import { GetStaticPropsContext } from "next";

export const AppSetupPageMap = {
  zapier: import("../../zapier/pages/setup/_getStaticProps"),
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  const { slug } = ctx.params || {};
  if (typeof slug !== "string") return { notFound: true } as const;

  const defaultProps = { props: {}, revalidate: 3600 /* one hours in seconds  */ };

  if (!(slug in AppSetupPageMap)) return defaultProps;

  const page = await AppSetupPageMap[slug as keyof typeof AppSetupPageMap];

  if (!page.getStaticProps) return defaultProps;

  const props = await page.getStaticProps(ctx);

  return {
    ...defaultProps,
    ...props,
  };
};
