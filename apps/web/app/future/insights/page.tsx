import LegacyPage from "@pages/insights/index";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/insights/getServerSideProps";
import { type inferSSRProps } from "@lib/types/inferSSRProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Insights",
    (t) => t("insights_subtitle")
  );

const getData = withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: LegacyPage });
