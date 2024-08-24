import { redirect } from "next/navigation";

import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import OnboardTeamMembersPage, { LayoutWrapper } from "~/settings/organizations/[id]/onboard-members-view";

const Page = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
  getLayout?: typeof LayoutWrapper;
}>(OnboardTeamMembersPage, {});

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export const buildWrappedOnboardTeamMembersPage = (
  id: string | string[] | undefined,
  page: React.ReactElement
) => {
  return (
    <WizardLayout
      currentStep={4}
      maxSteps={5}
      isOptionalCallback={() => {
        redirect(`/settings/organizations/${id}/add-teams`);
      }}>
      {page}
    </WizardLayout>
  );
};

export default Page;
export { getServerSideProps };
