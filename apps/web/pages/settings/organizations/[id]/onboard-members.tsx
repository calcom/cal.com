"use client";

import { redirect, useRouter } from "next/navigation";

import AddNewTeamMembers from "@calcom/features/ee/teams/components/AddNewTeamMembers";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, WizardLayout, WizardLayoutAppDir } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

const OnboardTeamMembersPage = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta
        title={t("invite_organization_admins")}
        description={t("invite_organization_admins_description")}
      />
      <AddNewTeamMembers isOrg={true} />
    </>
  );
};

OnboardTeamMembersPage.getLayout = (page: React.ReactElement) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const router = useRouter();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const query = useCompatSearchParams();

  return (
    <WizardLayout
      currentStep={4}
      maxSteps={5}
      isOptionalCallback={() => {
        router.push(`/settings/organizations/${query.get("id")}/add-teams`);
      }}>
      {page}
    </WizardLayout>
  );
};

export const buildWrappedOnboardTeamMembersPage = (
  id: string | string[] | undefined,
  page: React.ReactElement
) => {
  return (
    <WizardLayoutAppDir
      currentStep={4}
      maxSteps={5}
      isOptionalCallback={() => {
        redirect(`/settings/organizations/${id}/add-teams`);
      }}>
      {page}
    </WizardLayoutAppDir>
  );
};

OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
