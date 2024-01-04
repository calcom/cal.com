import OldPage from "@pages/settings/organizations/[id]/about";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { WizardLayout } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("about_your_organization"),
    (t) => t("about_your_organization_description")
  );

const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={3} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export default WithLayout({ Page: OldPage, getLayout: LayoutWrapper });
