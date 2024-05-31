import type { GetStaticPropsContext } from "next";

import { getTranslations } from "@server/lib/getTranslations";

import NotFoundPage from "./404/page";
import { WithLayout } from "./layoutHOC";

const getData = async (context: GetStaticPropsContext) => {
  const i18n = await getTranslations(context);

  return {
    i18n,
  };
};

export const dynamic = "force-static";

export default WithLayout({ getLayout: null, getData, Page: NotFoundPage });
