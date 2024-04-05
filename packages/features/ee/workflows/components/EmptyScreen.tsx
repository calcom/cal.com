import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import type { IconName } from "@calcom/ui";
import { CreateButtonWithTeamsList, EmptyScreen as ClassicEmptyScreen, Icon, showToast } from "@calcom/ui";

type WorkflowExampleType = {
  Icon: IconName;
  text: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { Icon: iconName, text } = props;

  return (
    <div className="border-subtle mx-2 my-2 max-h-24 max-w-[600px] rounded-md border border-solid p-6">
      <div className="flex ">
        <div className="flex items-center justify-center">
          <div className="bg-emphasis dark:bg-default mr-4 flex h-10 w-10 items-center justify-center rounded-full">
            <Icon name={iconName} className="text-default h-6 w-6 stroke-[2px]" />
          </div>
        </div>
        <div className="m-auto w-full flex-grow items-center justify-center ">
          <div className="text-semibold text-emphasis line-clamp-2 w-full text-sm font-medium">{text}</div>
        </div>
      </div>
    </div>
  );
}

export default function EmptyScreen(props: { isFilteredView: boolean }) {
  const { t } = useLocale();
  const router = useRouter();

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace(`/workflows/${workflow.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not authorized to create this workflow`;
        showToast(message, "error");
      }
    },
  });

  const workflowsExamples = [
    { icon: "smartphone", text: t("workflow_example_1") },
    { icon: "smartphone", text: t("workflow_example_2") },
    { icon: "mail", text: t("workflow_example_3") },
    { icon: "mail", text: t("workflow_example_4") },
    { icon: "mail", text: t("workflow_example_5") },
    { icon: "smartphone", text: t("workflow_example_6") },
  ] as const;
  // new workflow example when 'after meetings ends' trigger is implemented: Send custom thank you email to attendee after event (Smile icon),

  if (props.isFilteredView) {
    return <ClassicEmptyScreen Icon="zap" headline={t("no_workflows")} description={t("change_filter")} />;
  }

  return (
    <>
      <div className="min-h-80 flex w-full flex-col items-center justify-center rounded-md ">
        <div className="bg-emphasis flex h-[72px] w-[72px] items-center justify-center rounded-full">
          <Icon name="zap" className="dark:text-default inline-block h-10 w-10 stroke-[1.3px]" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{t("workflows")}</h2>
          <p className="text-default mt-3 line-clamp-2 text-sm font-normal leading-6 dark:text-gray-300">
            {t("no_workflows_description")}
          </p>
          <div className="mt-8 ">
            <CreateButtonWithTeamsList
              subtitle={t("new_workflow_subtitle").toUpperCase()}
              createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
              buttonText={t("create_workflow")}
              isPending={createMutation.isPending}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-row items-center justify-center">
        <div className="grid-cols-none items-center lg:grid lg:grid-cols-3 xl:mx-20">
          {workflowsExamples.map((example, index) => (
            <WorkflowExample key={index} Icon={example.icon} text={example.text} />
          ))}
        </div>
      </div>
    </>
  );
}
