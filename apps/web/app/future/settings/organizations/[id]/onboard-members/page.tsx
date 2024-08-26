import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapperAppDir";

import LegacyPage from "~/settings/organizations/[id]/onboard-members-view";

const buildWrappedOnboardTeamMembersPage = (id: string | string[] | undefined, page: React.ReactElement) => {
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
      getLayout={(page: React.ReactElement) => buildWrappedOnboardTeamMembersPage(params.id, page)}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}>
      <LegacyPage />
    </PageWrapper>
  );
};

export default Page;
