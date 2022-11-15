import { useSession } from "next-auth/react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert } from "@calcom/ui/Alert";
import Loader from "@calcom/ui/Loader";
import Shell from "@calcom/ui/Shell";

import { NewWorkflowButton } from "../components/NewWorkflowButton";
import WorkflowList from "../components/WorkflowListPage";

function WorkflowsPage() {
  const { t } = useLocale();

  const session = useSession();

  const me = useMeQuery();
  const isFreeUser = me.data?.plan === "FREE";

  const { data, isLoading } = trpc.viewer.workflows.list.useQuery();

  return (
    <Shell
      heading={t("workflows")}
      subtitle={t("workflows_to_automate_notifications")}
      CTA={session.data?.hasValidLicense && !isFreeUser ? <NewWorkflowButton /> : <></>}>
      <LicenseRequired>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            {isFreeUser ? (
              <Alert className="border " severity="warning" title={t("pro_feature_workflows")} />
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
