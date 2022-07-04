import { Loader } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import LicenseRequired from "@ee/components/LicenseRequired";
import WorkflowDetailsPage from "@ee/components/workflows/WorkflowDetailsPage";

import useMeQuery from "@lib/hooks/useMeQuery";

function WorkflowPage() {
  const me = useMeQuery();
  const isFreeUser = me.data?.plan === "FREE";
  const { isLoading } = me;

  return (
    <LicenseRequired>
      {isFreeUser ? (
        <Alert
          className="border "
          severity="warning"
          title="This is a pro feature. Upgrade to pro to automate your event notifications and reminders with workflows."
        />
      ) : (
        <WorkflowDetailsPage />
      )}
    </LicenseRequired>
  );
}

export default WorkflowPage;
