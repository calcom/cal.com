import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Icon } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import Loader from "@calcom/ui/Loader";
import { Button, showToast } from "@calcom/ui/v2";
import Shell from "@calcom/ui/v2/core/Shell";

import WorkflowList from "../../components/v2/WorkflowListPage";

function WorkflowsPage() {
  const { t } = useLocale();

  const session = useSession();
  const router = useRouter();

  const me = useMeQuery();

  const { data, isLoading } = trpc.useQuery(["viewer.workflows.list"]);

  const createMutation = trpc.useMutation("viewer.workflows.createV2", {
    onSuccess: async ({ workflow }) => {
      await router.replace("/workflows/" + workflow.id);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this event`;
        showToast(message, "error");
      }
    },
  });

  return session.data ? (
    <Shell
      heading={t("workflows")}
      subtitle={t("workflows_to_automate_notifications")}
      CTA={
        session.data?.hasValidLicense ? (
          <Button StartIcon={Icon.FiPlus} onClick={() => createMutation.mutate()}>
            {t("new_workflow_btn")}
          </Button>
        ) : (
          <></>
        )
      }>
      <LicenseRequired>
        {isLoading ? <Loader /> : <WorkflowList workflows={data?.workflows} />}
      </LicenseRequired>
    </Shell>
  ) : (
    <Loader />
  );
}

export default WorkflowsPage;
