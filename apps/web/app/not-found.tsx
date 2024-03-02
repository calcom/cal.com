import NotFoundPage from "@pages/404";
import { WithLayout } from "app/layoutHOC";
import type { GetStaticPropsContext } from "next";

import { getTranslations } from "@server/lib/getTranslations";

const getData = async (context: GetStaticPropsContext) => {
  const i18n = await getTranslations(context);

  return {
    i18n,
  };
};

export const dynamic = "force-static";

export default WithLayout({ getLayout: null, getData, Page: NotFoundPage });
