import type { GetServerSidePropsContext } from "next";

export const AppSetupPageMap = {
  alby: import("../../../apps/alby/pages/setup/_getServerSideProps"),
  make: import("../../../apps/make/pages/setup/_getServerSideProps"),
  zapier: import("../../../apps/zapier/pages/setup/_getServerSideProps"),
  stripe: import("../../../apps/stripepayment/pages/setup/_getServerSideProps"),
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { slug } = ctx.params || {};
  if (typeof slug !== "string") return { notFound: true } as const;

  if (!(slug in AppSetupPageMap)) return { props: {} };

  const page = await AppSetupPageMap[slug as keyof typeof AppSetupPageMap];

  if (!page.getServerSideProps) return { props: {} };

  const props = await page.getServerSideProps(ctx);

  return props;
};
