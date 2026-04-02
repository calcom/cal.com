import { useLocale } from "@calcom/lib/hooks/useLocale";
import cn from "@calcom/ui/classNames";
import { EmptyScreen as ClassicEmptyScreen } from "@calcom/ui/components/empty-screen";
import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";
import { CreateButtonWithTeamsList } from "~/ee/teams/components/createButton/CreateButtonWithTeamsList";
import { useWorkflowCreation, WorkflowCreationDialog } from "./WorkflowCreationDialog";

type WorkflowExampleType = {
  icon: IconName;
  iconWrapperClassName?: string;
  title: string;
  description: string;
  image?: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { icon: iconName, title, description, iconWrapperClassName, image } = props;

  return (
    <div className="bg-default border-subtle max-h-24 max-w-[600px] rounded-xl border border-solid p-2.5">
      <div className="flex">
        <div className="flex items-center justify-center">
          <div
            className={cn(
              "bg-emphasis dark:bg-default mr-4 flex h-10 w-10 items-center justify-center rounded-[10px]",
              iconWrapperClassName
            )}>
            {image ? (
              <img
                src={image}
                alt=""
                role="presentation"
                aria-hidden="true"
                className={cn("text-default h-5 w-5")}
              />
            ) : (
              <Icon name={iconName} className={cn("text-default h-5 w-5")} aria-hidden="true" />
            )}
          </div>
        </div>
        <div className="m-auto w-full grow items-center justify-center ">
          <div className="text-semibold text-emphasis line-clamp-2 w-full text-sm font-semibold">{title}</div>
          <div className="text-default text-sm font-normal leading-none">{description}</div>
        </div>
      </div>
    </div>
  );
}

export default function EmptyScreen(props: { isFilteredView: boolean }) {
  const { t } = useLocale();
  const { showDialog, setShowDialog, pendingTeamId, openDialog } = useWorkflowCreation();

  const workflowsExamples: WorkflowExampleType[] = [
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
      title: t("email_to_remind_booking"),
      description: t("email_to_remind_booking_description"),
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
  ];

  const calAITemplates: WorkflowExampleType[] = [
    {
      icon: "phone-outgoing",
      title: t("call_to_confirm_booking"),
      description: t("cal_ai_phone_call_action_description"),
      iconWrapperClassName: "bg-[#2A2947]",
      image: "/call-outgoing.svg",
    },
    {
      icon: "phone-outgoing",
      title: t("follow_up_with_no_shows"),
      description: t("follow_up_with_no_shows_description"),
      iconWrapperClassName: "bg-[#2A2947]",
      image: "/call-outgoing.svg",
    },
    {
      icon: "phone-outgoing",
      title: t("remind_attendees_to_bring_id"),
      description: t("remind_attendees_to_bring_id_description"),
      iconWrapperClassName: "bg-[#2A2947]",
      image: "/call-outgoing.svg",
    },
  ];
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
          <p className="text-default line-clamp-2 mt-3 text-sm font-normal leading-6 dark:text-gray-300">
            {t("no_workflows_description")}
          </p>
          <div className="mt-8 ">
            <CreateButtonWithTeamsList
              subtitle={t("new_workflow_subtitle").toUpperCase()}
              disableMobileButton={true}
              createFunction={openDialog}
              buttonText={t("create_workflow")}
              includeOrg={true}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <TemplateSection title={t("cal_ai_templates")} examples={calAITemplates} />
        <TemplateSection title={t("standard_templates")} examples={workflowsExamples} />
      </div>

      <WorkflowCreationDialog open={showDialog} onOpenChange={setShowDialog} teamId={pendingTeamId} />
    </>
  );
}

const TemplateSection = ({ title, examples }: { title: string; examples: WorkflowExampleType[] }) => {
  return (
    <div className="flex items-center justify-center">
      <div className="bg-cal-muted flex max-w-5xl flex-col rounded-md p-2">
        <h2 className="text-emphasis mb-2 text-base font-semibold">{title}</h2>
        <div className="grid grid-cols-1 items-center gap-2 lg:grid-cols-3">
          {examples.map((example: WorkflowExampleType, index: number) => (
            <WorkflowExample
              key={index}
              icon={example.icon}
              title={example.title}
              description={example.description}
              iconWrapperClassName={example.iconWrapperClassName}
              image={example.image}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
