import type { GetStaticPropsContext, InferGetStaticPropsType } from "next";

import { getTranslations } from "@server/lib/getTranslations";

export type PageProps = InferGetStaticPropsType<typeof getStaticProps>;
export const getStaticProps = async (context: GetStaticPropsContext) => {
  const i18n = await getTranslations(context);

  return {
    props: {
      i18n,
    },
  };
};
