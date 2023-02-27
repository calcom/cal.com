import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import type { SVGComponent } from "@calcom/types/SVGComponent";
import { CreateButton, showToast, EmptyScreen as ClassicEmptyScreen } from "@calcom/ui";
import { FiSmartphone, FiMail, FiZap } from "@calcom/ui/components/icon";

type WorkflowExampleType = {
  Icon: SVGComponent;
  text: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { Icon, text } = props;

  return (
    <div className="mx-2 my-2 max-h-24 max-w-[600px] rounded-md border border-solid p-6">
      <div className="flex ">
        <div className="flex items-center justify-center">
          <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-white">
            <Icon className="h-6 w-6 stroke-[2px] text-gray-700" />
          </div>
        </div>
        <div className="m-auto w-full flex-grow items-center justify-center ">
          <div className="line-clamp-2 text-semibold w-full text-sm font-medium leading-none text-gray-900">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmptyScreen(props: {
  profileOptions: {
    label: string | null;
    image?: string | null;
    teamId: number | null | undefined;
  }[];
  isFilteredView: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace("/workflows/" + workflow.id);
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
    { icon: FiSmartphone, text: t("workflow_example_1") },
    { icon: FiSmartphone, text: t("workflow_example_2") },
    { icon: FiMail, text: t("workflow_example_3") },
    { icon: FiMail, text: t("workflow_example_4") },
    { icon: FiMail, text: t("workflow_example_5") },
    { icon: FiSmartphone, text: t("workflow_example_6") },
  ];
  // new workflow example when 'after meetings ends' trigger is implemented: Send custom thank you email to attendee after event (FiSmile icon),

  if (props.isFilteredView) {
    return <ClassicEmptyScreen Icon={FiZap} headline={t("no_workflows")} description={t("change_filter")} />;
  }

  return (
    <>
      <div className="min-h-80 flex w-full flex-col items-center justify-center rounded-md ">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-200 dark:bg-white">
          <FiZap className="inline-block h-10 w-10 stroke-[1.3px] dark:bg-gray-900 dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{t("workflows")}</h2>
          <p className="line-clamp-2 mt-3 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
            {t("no_workflows_description")}
          </p>
          <div className="mt-8 ">
            <CreateButton
              subtitle={t("new_workflow_subtitle").toUpperCase()}
              options={props.profileOptions}
              createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
              buttonText={t("create_workflow")}
              isLoading={createMutation.isLoading}
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
