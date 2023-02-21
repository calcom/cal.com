import type { GetStaticPropsContext } from "next";

export const AppSetupPageMap = {
  zapier: import("../../zapier/pages/setup/_getStaticProps"),
};

export const getStaticProps = async (ctx: GetStaticPropsContext) => {
  const { slug } = ctx.params || {};
  if (typeof slug !== "string") return { notFound: true } as const;

  if (!(slug in AppSetupPageMap)) return { props: {} };

  const page = await AppSetupPageMap[slug as keyof typeof AppSetupPageMap];

  if (!page.getStaticProps) return { props: {} };

  const props = await page.getStaticProps(ctx);

  return props;
};
