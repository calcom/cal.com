"use client";

import { useRouter } from "next/navigation";

import AddNewTeamMembers from "@calcom/features/ee/teams/components/AddNewTeamMembers";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { WizardLayout } from "@calcom/ui";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
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
      {children}
    </WizardLayout>
  );
};

const OrgAddNewTeamMembers = () => <AddNewTeamMembers isOrg={true} />;
export default OrgAddNewTeamMembers;
