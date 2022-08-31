import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Icon } from "@calcom/ui";
import Loader from "@calcom/ui/Loader";
import { Alert, Button, showToast } from "@calcom/ui/v2";
import Shell from "@calcom/ui/v2/core/Shell";

import LicenseRequired from "../../../common/components/v2/LicenseRequired";
import WorkflowList from "../../components/v2/WorkflowListPage";

function WorkflowsPage() {
  const { t } = useLocale();

  const session = useSession();
  const router = useRouter();

  const me = useMeQuery();
  const isFreeUser = me.data?.plan === "FREE";

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
        const message = `${err.data.code}: You are not able to create this workflow`;
        showToast(message, "error");
      }
    },
  });

  return session.data ? (
    <Shell
      heading={data?.workflows.length ? t("workflows") : ""}
      subtitle={data?.workflows.length ? t("workflows_to_automate_notifications") : ""}
      CTA={
        session.data?.hasValidLicense && !isFreeUser && data?.workflows && data?.workflows.length > 0 ? (
          <Button
            StartIcon={Icon.FiPlus}
            onClick={() => createMutation.mutate()}
            loading={createMutation.isLoading}>
            {t("new")}
          </Button>
        ) : (
          <></>
        )
      }>
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
  ) : (
    <Loader />
  );
}

export default WorkflowsPage;
