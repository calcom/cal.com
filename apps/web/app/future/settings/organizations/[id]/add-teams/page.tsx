import OldPage from "@pages/settings/organizations/[id]/add-teams";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { redirect } from "next/navigation";

import { WizardLayout } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

const LayoutWrapper = (page: React.ReactElement) => (
  <WizardLayout
    currentStep={5}
    maxSteps={5}
    isOptionalCallback={() => {
      redirect(`/event-types`);
    }}>
    {page}
  </WizardLayout>
);

export default WithLayout({ Page: OldPage, getLayout: LayoutWrapper });
