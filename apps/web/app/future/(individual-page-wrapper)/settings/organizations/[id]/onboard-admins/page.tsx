import OldPage from "@pages/settings/organizations/[id]/onboard-admins";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapperAppDir";

type PageProps = Readonly<{
  params: Params;
}>;

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("invite_organization_admins"),
    (t) => t("invite_organization_admins_description")
  );

const Page = ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper
      getLayout={(page: React.ReactElement) => (
        <WizardLayout
          currentStep={4}
          maxSteps={5}
          isOptionalCallback={() => {
            redirect(`/settings/organizations/${params.id}/add-teams`);
          }}>
          {page}
        </WizardLayout>
      )}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}>
      <OldPage />
    </PageWrapper>
  );
};

export default Page;
