"use client";

import type { AppProps as NextAppProps } from "next/app";
import { redirect } from "next/navigation";

import { AddNewOrgAdminsForm } from "@calcom/features/ee/organizations/components";
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
      <div className="mt-8 h-[414px]" />
      <iframe className="mx-auto h-full w-[276px]" src="https://cal.games/" />
      <AddNewOrgAdminsForm />
    </>
  );
};

OnboardTeamMembersPage.getLayout = (page: React.ReactElement, router: NextAppProps["router"]) => (
  <WizardLayout
    currentStep={4}
    maxSteps={5}
    isOptionalCallback={() => {
      router.push(`/settings/organizations/${router.query.id}/add-teams`);
    }}>
    {page}
  </WizardLayout>
);

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
