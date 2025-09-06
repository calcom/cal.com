import { useRouter } from "next/navigation";

import { CreateButtonWithTeamsList } from "@calcom/features/ee/teams/components/createButton/CreateButtonWithTeamsList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { EmptyScreen as ClassicEmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type WorkflowExampleType = {
  Icon: IconName;
  title: string;
  description: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { Icon: iconName, title, description } = props;

  return (
    <div className="bg-default border-subtle mx-2 my-2 max-h-24 max-w-[600px] rounded-xl border border-solid p-2.5">
      <div className="flex">
        <div className="flex items-center justify-center">
          <div className="bg-emphasis dark:bg-default mr-4 flex h-10 w-10 items-center justify-center rounded-full">
            <Icon name={iconName} className="text-default h-6 w-6 stroke-[2px]" />
          </div>
        </div>
        <div className="m-auto w-full flex-grow items-center justify-center ">
          <div className="text-semibold text-emphasis line-clamp-2 w-full text-sm font-semibold">{title}</div>
          <div className="text-default text-sm font-normal leading-none">{description}</div>
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
        const message = `${err.data.code}: ${t("unauthorized_create_workflow")}`;
        showToast(message, "error");
      }
    },
  });

  const workflowsExamples = [
    { icon: "smartphone", title: t("send_sms_reminder"), description: t("send_sms_reminder_description") },
    {
      icon: "smartphone",
      title: t("follow_up_with_no_shows"),
      description: t("follow_up_with_no_shows_description"),
    },
    {
      icon: "mail",
      title: t("remind_attendees_to_bring_id"),
      description: t("remind_attendees_to_bring_id_description"),
    },
    {
      icon: "mail",
      title: t("email_to_reminde_booking"),
      description: t("email_to_reminde_booking_description"),
    },
    {
      icon: "mail",
      title: t("custom_email_reminder"),
      description: t("custom_email_reminder_description"),
    },
    {
      icon: "smartphone",
      title: t("custom_sms_reminder"),
      description: t("custom_sms_reminder_description"),
    },
  ] as constant;
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
              includeOrg={true}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="bg-muted flex max-w-5xl flex-col rounded-md p-2">
          <h2 className="text-emphasis ml-2 text-base font-semibold">Standard Templates</h2>
          <div className="grid-cols-none items-center lg:grid lg:grid-cols-3">
            {workflowsExamples.map((example, index) => (
              <WorkflowExample
                key={index}
                Icon={example.icon}
                title={example.title}
                description={example.description}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
