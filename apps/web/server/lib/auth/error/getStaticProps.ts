import type { GetStaticPropsContext } from "next";

import { getTranslations } from "@server/lib/getTranslations";

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const i18n = await getTranslations(context);

  return {
    props: {
      i18n,
    },
  };
};
