import { useLocale } from "@calcom/lib/hooks/useLocale";

import { withQuery } from "@lib/QueryCell";

import Shell from "@components/Shell";
import SkeletonLoader from "@components/availability/SkeletonLoader";
import { NewWorkflowButton } from "@components/workflows/NewWorkflowButton";

const WithQuery = withQuery(["viewer.availability.list"]);

export default function Workflows() {
  const { t } = useLocale();
  return (
    <div>
      <Shell
        heading={t("workflows")}
        subtitle={t("workflows_to_automate_notifications")}
        CTA={<NewWorkflowButton />}
        customLoader={<SkeletonLoader />}>
        <WithQuery success={({ data }) => <div>Workflows</div>} customLoader={<SkeletonLoader />} />
      </Shell>
    </div>
  );
}
