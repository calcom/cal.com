"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/license-key/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import CreateANewLicenseKeyForm, { LayoutWrapper } from "~/settings/license-key/new/new-view";

const CreateNewLicenseKeyPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("set_up_your_organization")} description={t("organizations_description")} />
      <CreateANewLicenseKeyForm />
    </>
  );
};

CreateNewLicenseKeyPage.getLayout = LayoutWrapper;
CreateNewLicenseKeyPage.PageWrapper = PageWrapper;

export default CreateNewLicenseKeyPage;

export { getServerSideProps };
