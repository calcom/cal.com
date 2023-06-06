import { CreateANewOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const CreateNewOrganizationPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("set_up_your_organization")} description={t("organizations_description")} />
      <CreateANewOrganizationForm />
    </>
  );
};
const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

CreateNewOrganizationPage.getLayout = LayoutWrapper;
CreateNewOrganizationPage.PageWrapper = PageWrapper;

export default CreateNewOrganizationPage;
