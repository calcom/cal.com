import { useSession } from "next-auth/react";

import { Alert } from "@calcom/ui/Alert";
import LicenseRequired from "@ee/components/LicenseRequired";
import { NewWorkflowButton } from "@ee/components/workflows/NewWorkflowButton";
import WorkflowList from "@ee/components/workflows/WorkflowListPage";

import { useLocale } from "@lib/hooks/useLocale";
import useMeQuery from "@lib/hooks/useMeQuery";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";

function WorkflowsPage() {
  const { t } = useLocale();

  const session = useSession();

  const me = useMeQuery();
  const isFreeUser = me.data?.plan === "FREE";

  const { data, isLoading } = trpc.useQuery(["viewer.workflows.list"]);

  return (
    <Shell
      heading={t("workflows")}
      subtitle={t("workflows_to_automate_notifications")}
      CTA={session.data?.hasValidLicense ? <NewWorkflowButton /> : <></>}>
      <LicenseRequired>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            {isFreeUser ? (
              <Alert
                className="border "
                severity="warning"
                title="This is a pro feature. Upgrade to pro to automate your event notifications and reminders with workflows."
              />
            ) : (
              <WorkflowList workflows={data?.workflows} />
            )}
          </>
        )}
      </LicenseRequired>
    </Shell>
  );
}

export default WorkflowsPage;
