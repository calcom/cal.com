import { zodResolver } from "@hookform/resolvers/zod";
import type { WorkflowStep } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Shell from "@calcom/features/shell/Shell";
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
});

const querySchema = z.object({
  workflow: stringOrNumber,
});

function WorkflowPage() {
  const { t, i18n } = useLocale();
  const session = useSession();
  const router = useRouter();
  const params = useParamsWithFallback();

  const [selectedEventTypes, setSelectedEventTypes] = useState<Option[]>([]);
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false);
  const [isMixedEventType, setIsMixedEventType] = useState(false); //for old event types before team workflows existed

  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });

  const { workflow: workflowId } = params ? querySchema.parse(params) : { workflow: -1 };
  const utils = trpc.useContext();

  const userQuery = useMeQuery();
  const user = userQuery.data;

  const {
    data: workflow,
    isError,
    error,
    isLoading,
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

  const readOnly =
    workflow?.team?.members?.find((member) => member.userId === session.data?.user.id)?.role ===
    MembershipRole.MEMBER;

  useEffect(() => {
    if (workflow && !isLoading) {
      if (workflow.userId && workflow.activeOn.find((active) => !!active.eventType.teamId)) {
        setIsMixedEventType(true);
      }
      setSelectedEventTypes(
        workflow.activeOn.flatMap((active) => {
          if (workflow.teamId && active.eventType.parentId) return [];
          return {
            value: String(active.eventType.id),
            label: active.eventType.title,
          };
        }) || []
      );
      const activeOn = workflow.activeOn
        ? workflow.activeOn.map((active) => ({
            value: active.eventType.id.toString(),
            label: active.eventType.slug,
          }))
        : undefined;

      //translate dynamic variables into local language
      const steps = workflow.steps.map((step) => {
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

      form.setValue("name", workflow.name);
      form.setValue("steps", steps);
      form.setValue("trigger", workflow.trigger);
      form.setValue("time", workflow.time || undefined);
      form.setValue("timeUnit", workflow.timeUnit || undefined);
      form.setValue("activeOn", activeOn || []);
      setIsAllDataLoaded(true);
    }
  }, [isLoading]);

  const updateMutation = trpc.viewer.workflows.update.useMutation({
    onSuccess: async ({ workflow }) => {
      if (workflow) {
        utils.viewer.workflows.get.setData({ id: +workflow.id }, workflow);

        showToast(
          t("workflow_updated_successfully", {
            workflowName: workflow.name,
          }),
          "success"
        );
      }
      router.push("/workflows");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  return session.data ? (
    <Form
      form={form}
      handleSubmit={async (values) => {
        let activeOnEventTypeIds: number[] = [];
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
            step.reminderBody = translateVariablesToEnglish(step.reminderBody, { locale: i18n.language, t });
          }
          if (step.emailSubject) {
            step.emailSubject = translateVariablesToEnglish(step.emailSubject, { locale: i18n.language, t });
          }
          isEmpty = !isEmpty ? isBodyEmpty : isEmpty;

          //check if phone number is verified
          if (
            (step.action === WorkflowActions.SMS_NUMBER || step.action === WorkflowActions.WHATSAPP_NUMBER) &&
            !verifiedNumbers?.find((verifiedNumber) => verifiedNumber.phoneNumber === step.sendTo)
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
            activeOnEventTypeIds = values.activeOn.map((option) => {
              return parseInt(option.value, 10);
            });
          }
          updateMutation.mutate({
            id: workflowId,
            name: values.name,
            activeOn: activeOnEventTypeIds,
            steps: values.steps,
            trigger: values.trigger,
            time: values.time || null,
            timeUnit: values.timeUnit || null,
          });
          utils.viewer.workflows.getVerifiedNumbers.invalidate();
        }
      }}>
      <Shell
        backPath="/workflows"
        title={workflow && workflow.name ? workflow.name : "Untitled"}
        CTA={
          !readOnly && (
            <div>
              <Button data-testid="save-workflow" type="submit" loading={updateMutation.isLoading}>
                {t("save")}
              </Button>
            </div>
          )
        }
        hideHeadingOnMobile
        heading={
          session.data?.hasValidLicense &&
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
        <LicenseRequired>
          {!isError ? (
            <>
              {isAllDataLoaded && user ? (
                <>
                  <WorkflowDetailsPage
                    form={form}
                    workflowId={+workflowId}
                    user={user}
                    selectedEventTypes={selectedEventTypes}
                    setSelectedEventTypes={setSelectedEventTypes}
                    teamId={workflow ? workflow.teamId || undefined : undefined}
                    isMixedEventType={isMixedEventType}
                    readOnly={readOnly}
                  />
                </>
              ) : (
                <SkeletonLoader />
              )}
            </>
          ) : (
            <Alert severity="error" title="Something went wrong" message={error.message} />
          )}
        </LicenseRequired>
      </Shell>
    </Form>
  ) : (
    <></>
  );
}

export default WorkflowPage;
