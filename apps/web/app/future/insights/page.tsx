import LegacyPage from "@pages/insights/index";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { type inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "@lib/insights/getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Insights",
    (t) => t("insights_subtitle")
  );

const getData = withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: LegacyPage });
