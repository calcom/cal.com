import type { GetServerSidePropsContext } from "next";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { CreateANewOrganizationForm } from "@calcom/features/ee/organizations/components";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

const CreateNewOrganizationPage = ({ querySlug }: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();
  return (
    <LicenseRequired>
      <Meta title={t("set_up_your_organization")} description={t("organizations_description")} />
      <CreateANewOrganizationForm slug={querySlug} />
    </LicenseRequired>
  );
};
const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  // Check if organizations are enabled
  if (flags["organizations"] !== true) {
    return {
      notFound: true,
    };
  }

  const querySlug = context.query.slug as string;

  return {
    props: {
      querySlug: querySlug ?? null,
    },
  };
};

CreateNewOrganizationPage.getLayout = LayoutWrapper;
CreateNewOrganizationPage.PageWrapper = PageWrapper;

export default CreateNewOrganizationPage;
