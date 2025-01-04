import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/routing/getServerSideProps";

import LegacyPage, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

export const generateMetadata = async ({ searchParams }: { searchParams: Record<string, string> }) => {
  const legacyContext = buildLegacyCtx(headers(), cookies(), {}, searchParams);
  const data = await getData(legacyContext);

  return await _generateMetadata(
    (t) => t("routing_forms"),
    (t) => t("routing_forms_description")
  );
};

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({
  getLayout,
  getData,
  Page: LegacyPage,
});
