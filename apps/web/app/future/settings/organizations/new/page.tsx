import LegacyPage, { getServerSideProps, LayoutWrapperAppDir } from "@pages/settings/organizations/new/index";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { type inferSSRProps } from "@lib/types/inferSSRProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_organization"),
    (t) => t("organizations_description")
  );

export default WithLayout({
  getLayout: LayoutWrapperAppDir,
  Page: LegacyPage,
  getData: withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps),
});
