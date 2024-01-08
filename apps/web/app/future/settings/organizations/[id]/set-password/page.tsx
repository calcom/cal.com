import LegacyPage from "@pages/settings/organizations/[id]/set-password";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { WizardLayoutAppDir } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_a_password"),
    (t) => t("set_a_password_description")
  );

const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayoutAppDir currentStep={2} maxSteps={5}>
      {page}
    </WizardLayoutAppDir>
  );
};

export default WithLayout({ Page: LegacyPage, getLayout: LayoutWrapper });
