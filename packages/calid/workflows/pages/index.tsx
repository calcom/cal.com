import Shell from "@calcom/features/shell/Shell";

import { Workflows } from "../components/workflows";

const WorkflowsPage = () => {
  // const { t } = useLocale();

  // return (
  //   <Shell heading={t("platform_billing")} title={t("platform_billing")}>
  //     <ShellMain
  //       heading={t("workflows")}
  //       subtitle={t("workflows_to_automate_notifications")}
  //       title={t("workflows")}
  //       description={t("workflows_to_automate_notifications")}>
  //       <Workflows />
  //     </ShellMain>
  //   </Shell>
  // );

  return (
    <Shell>
      <Workflows />
    </Shell>
  );
};

export default WorkflowsPage;
