import { zodResolver } from "@hookform/resolvers/zod";
import type { WorkflowStep } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { SENDER_ID } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { HttpError } from "@calcom/lib/http-error";
import {
  MembershipRole,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui";
import { Alert, Badge, Button, Form, showToast } from "@calcom/ui";

import LicenseRequired from "../../common/components/LicenseRequired";
import SkeletonLoader from "../components/SkeletonLoaderEdit";
import WorkflowDetailsPage from "../components/WorkflowDetailsPage";
import { isSMSAction, isSMSOrWhatsappAction } from "../lib/actionHelperFunctions";
import { getTranslatedText, translateVariablesToEnglish } from "../lib/variableTranslations";

export type FormValues = {
  name: string;
  activeOn: Option[];
  steps: (WorkflowStep & { senderName: string | null })[];
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  selectAll: boolean;
};

export function onlyLettersNumbersSpaces(str: string) {
  if (str.length <= 11 && /^[A-Za-z0-9\s]*$/.test(str)) {
    return true;
  }
  return false;
}

const formSchema = z.object({
  name: z.string(),
  activeOn: z.object({ value: z.string(), label: z.string() }).array(),
  trigger: z.nativeEnum(WorkflowTriggerEvents),
  time: z.number().gte(0).optional(),
  timeUnit: z.nativeEnum(TimeUnit).optional(),
  steps: z
    .object({
      id: z.number(),
      stepNumber: z.number(),
      action: z.nativeEnum(WorkflowActions),
      workflowId: z.number(),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      template: z.nativeEnum(WorkflowTemplates),
      numberRequired: z.boolean().nullable(),
      includeCalendarEvent: z.boolean().nullable(),
      sendTo: z
        .string()
        .refine((val) => isValidPhoneNumber(val) || val.includes("@"))
        .optional()
        .nullable(),
      sender: z
        .string()
        .refine((val) => onlyLettersNumbersSpaces(val))
        .optional()
        .nullable(),
      senderName: z.string().optional().nullable(),
    })
    .array(),
  selectAll: z.boolean(),
});

const querySchema = z.object({
  workflow: stringOrNumber,
});

function WorkflowPage() {
  const { t, i18n } = useLocale();
  const session = useSession();
  const params = useParamsWithFallback();

  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false);
  const [isMixedEventType, setIsMixedEventType] = useState(false); //for old event types before team workflows existed

  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });

  const { workflow: workflowId } = params ? querySchema.parse(params) : { workflow: -1 };
  const utils = trpc.useUtils();

  const userQuery = useMeQuery();
  const user = userQuery.data;

  const {
    data: workflow,
    isError,
    error,
    isPending: isPendingWorkflow,
  } = trpc.viewer.workflows.get.useQuery(
    { id: +workflowId },
    {
      enabled: !!workflowId,
    }
  );

  const { data: verifiedNumbers } = trpc.viewer.workflows.getVerifiedNumbers.useQuery(
    { teamId: workflow?.team?.id },
    {
      enabled: !!workflow?.id,
    }
  );

  const { data: verifiedEmails } = trpc.viewer.workflows.getVerifiedEmails.useQuery({
    teamId: workflow?.team?.id,
  });

  const { data: eventTypeGroups, isPending: isPendingEventTypes } =
    trpc.viewer.eventTypes.getByViewer.useQuery();

  const { data: otherTeams, isPending: isPendingTeams } = trpc.viewer.organizations.listOtherTeams.useQuery();
  const isOrg = workflow?.team?.isOrganization ?? false;

  const teamId = workflow?.teamId ?? undefined;

  const profileTeamsOptions =
    isOrg && eventTypeGroups
      ? eventTypeGroups?.profiles
          .filter((profile) => !!profile.teamId)
          .map((profile) => {
            return {
              value: String(profile.teamId) || "",
              label: profile.name || profile.slug || "",
            };
          })
      : [];

  const otherTeamsOptions = otherTeams
    ? otherTeams.map((team) => {
        return {
          value: String(team.id) || "",
          label: team.name || team.slug || "",
        };
      })
    : [];

  const teamOptions = profileTeamsOptions.concat(otherTeamsOptions);

  const eventTypeOptions = useMemo(
    () =>
      eventTypeGroups?.eventTypeGroups.reduce((options, group) => {
        /** don't show team event types for user workflow */
        if (!teamId && group.teamId) return options;
        /** only show correct team event types for team workflows */
        if (teamId && teamId !== group.teamId) return options;
        return [
          ...options,
          ...group.eventTypes
            .filter(
              (evType) =>
                !evType.metadata?.managedEventConfig ||
                !!evType.metadata?.managedEventConfig.unlockedFields?.workflows ||
                !!teamId
            )
            .map((eventType) => ({
              value: String(eventType.id),
              label: `${eventType.title} ${
                eventType.children && eventType.children.length ? `(+${eventType.children.length})` : ``
              }`,
            })),
        ];
      }, [] as Option[]) || [],
    [eventTypeGroups]
  );

  let allEventTypeOptions = eventTypeOptions;
  const distinctEventTypes = new Set();

  if (!teamId && isMixedEventType) {
    allEventTypeOptions = [...eventTypeOptions, ...selectedOptions];
    allEventTypeOptions = allEventTypeOptions.filter((option) => {
      const duplicate = distinctEventTypes.has(option.value);
      distinctEventTypes.add(option.value);
      return !duplicate;
    });
  }

  const readOnly =
    workflow?.team?.members?.find((member) => member.userId === session.data?.user.id)?.role ===
    MembershipRole.MEMBER;

  const isPending = isPendingWorkflow || isPendingEventTypes || isPendingTeams;

  useEffect(() => {
    if (!isPending) {
      setFormData(workflow);
    }
  }, [isPending]);

  function setFormData(workflowData: RouterOutputs["viewer"]["workflows"]["get"] | undefined) {
    if (workflowData) {
      if (workflowData.userId && workflowData.activeOn.find((active) => !!active.eventType.teamId)) {
        setIsMixedEventType(true);
      }
      let activeOn;

      if (workflowData.isActiveOnAll) {
        activeOn = isOrg ? teamOptions : allEventTypeOptions;
      } else {
        if (isOrg) {
          activeOn = workflowData.activeOnTeams.flatMap((active) => {
            return {
              value: String(active.team.id) || "",
              label: active.team.slug || "",
            };
          });
          setSelectedOptions(activeOn || []);
        } else {
          setSelectedOptions(
            workflowData.activeOn.flatMap((active) => {
              if (workflowData.teamId && active.eventType.parentId) return [];
              return {
                value: String(active.eventType.id),
                label: active.eventType.title,
              };
            }) || []
          );
          activeOn = workflowData.activeOn
            ? workflowData.activeOn.map((active) => ({
                value: active.eventType.id.toString(),
                label: active.eventType.slug,
              }))
            : undefined;
        }
      }
      //translate dynamic variables into local language
      const steps = workflowData.steps.map((step) => {
        const updatedStep = {
          ...step,
          senderName: step.sender,
          sender: isSMSAction(step.action) ? step.sender : SENDER_ID,
        };
        if (step.reminderBody) {
          updatedStep.reminderBody = getTranslatedText(step.reminderBody || "", {
            locale: i18n.language,
            t,
          });
        }
        if (step.emailSubject) {
          updatedStep.emailSubject = getTranslatedText(step.emailSubject || "", {
            locale: i18n.language,
            t,
          });
        }
        return updatedStep;
      });

      form.setValue("name", workflowData.name);
      form.setValue("steps", steps);
      form.setValue("trigger", workflowData.trigger);
      form.setValue("time", workflowData.time || undefined);
      form.setValue("timeUnit", workflowData.timeUnit || undefined);
      form.setValue("activeOn", activeOn || []);
      form.setValue("selectAll", workflowData.isActiveOnAll ?? false);
      setIsAllDataLoaded(true);
    }
  }

  const updateMutation = trpc.viewer.workflows.update.useMutation({
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        utils.viewer.workflows.get.setData({ id: +workflow.id }, workflow);
        setFormData(workflow);
        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
      }
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  return session.data ? (
    <Shell withoutMain backPath="/workflows">
      <LicenseRequired>
        <Form
          form={form}
          handleSubmit={async (values) => {
            let activeOnIds: number[] = [];
            let isEmpty = false;
            let isVerified = true;

            values.steps.forEach((step) => {
              const strippedHtml = step.reminderBody?.replace(/<[^>]+>/g, "") || "";

              const isBodyEmpty = !isSMSOrWhatsappAction(step.action) && strippedHtml.length <= 1;

              if (isBodyEmpty) {
                form.setError(`steps.${step.stepNumber - 1}.reminderBody`, {
                  type: "custom",
                  message: t("fill_this_field"),
                });
              }

              if (step.reminderBody) {
                step.reminderBody = translateVariablesToEnglish(step.reminderBody, {
                  locale: i18n.language,
                  t,
                });
              }
              if (step.emailSubject) {
                step.emailSubject = translateVariablesToEnglish(step.emailSubject, {
                  locale: i18n.language,
                  t,
                });
              }
              isEmpty = !isEmpty ? isBodyEmpty : isEmpty;

              //check if phone number is verified
              if (
                (step.action === WorkflowActions.SMS_NUMBER ||
                  step.action === WorkflowActions.WHATSAPP_NUMBER) &&
                !verifiedNumbers?.find((verifiedNumber) => verifiedNumber.phoneNumber === step.sendTo)
              ) {
                isVerified = false;

                form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
                  type: "custom",
                  message: t("not_verified"),
                });
              }

              if (
                step.action === WorkflowActions.EMAIL_ADDRESS &&
                !verifiedEmails?.find((verifiedEmail) => verifiedEmail.email === step.sendTo)
              ) {
                isVerified = false;

                form.setError(`steps.${step.stepNumber - 1}.sendTo`, {
                  type: "custom",
                  message: t("not_verified"),
                });
              }
            });

            if (!isEmpty && isVerified) {
              if (values.activeOn) {
                activeOnIds = values.activeOn
                  .filter((option) => option.value !== "all")
                  .map((option) => {
                    return parseInt(option.value, 10);
                  });
              }
              updateMutation.mutate({
                id: workflowId,
                name: values.name,
                activeOn: activeOnIds,
                steps: values.steps,
                trigger: values.trigger,
                time: values.time || null,
                timeUnit: values.timeUnit || null,
                isActiveOnAll: values.selectAll || false,
              });
              utils.viewer.workflows.getVerifiedNumbers.invalidate();
            }
          }}>
          <ShellMain
            backPath="/workflows"
            title={workflow && workflow.name ? workflow.name : "Untitled"}
            CTA={
              !readOnly && (
                <div>
                  <Button data-testid="save-workflow" type="submit" loading={updateMutation.isPending}>
                    {t("save")}
                  </Button>
                </div>
              )
            }
            hideHeadingOnMobile
            heading={
              isAllDataLoaded && (
                <div className="flex">
                  <div className={classNames(workflow && !workflow.name ? "text-muted" : "")}>
                    {workflow && workflow.name ? workflow.name : "untitled"}
                  </div>
                  {workflow && workflow.team && (
                    <Badge className="ml-4 mt-1" variant="gray">
                      {workflow.team.name}
                    </Badge>
                  )}
                  {readOnly && (
                    <Badge className="ml-4 mt-1" variant="gray">
                      {t("readonly")}
                    </Badge>
                  )}
                </div>
              )
            }>
            {!isError ? (
              <>
                {isAllDataLoaded && user ? (
                  <>
                    <WorkflowDetailsPage
                      form={form}
                      workflowId={+workflowId}
                      user={user}
                      selectedOptions={selectedOptions}
                      setSelectedOptions={setSelectedOptions}
                      teamId={workflow ? workflow.teamId || undefined : undefined}
                      readOnly={readOnly}
                      isOrg={isOrg}
                      allOptions={isOrg ? teamOptions : allEventTypeOptions}
                    />
                  </>
                ) : (
                  <SkeletonLoader />
                )}
              </>
            ) : (
              <Alert severity="error" title="Something went wrong" message={error.message} />
            )}
          </ShellMain>
        </Form>
      </LicenseRequired>
    </Shell>
  ) : (
    <></>
  );
}

export default WorkflowPage;
