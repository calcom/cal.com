import LegacyPage from "@pages/settings/organizations/[id]/add-teams";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { redirect } from "next/navigation";

import { WizardLayoutAppDir } from "@calcom/ui";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description")
  );

const LayoutWrapper = (page: React.ReactElement) => (
  <WizardLayoutAppDir
    currentStep={5}
    maxSteps={5}
    isOptionalCallback={() => {
      redirect(`/event-types`);
    }}>
    {page}
  </WizardLayoutAppDir>
);

export default WithLayout({ Page: LegacyPage, getLayout: LayoutWrapper });
