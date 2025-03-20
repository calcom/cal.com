import { AtomsWrapper } from "@/components/atoms-wrapper";

import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";
import CreateEventTypeForm from "@calcom/features/eventtypes/components/CreateEventTypeForm";
import { useCreateEventTypeForm } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventType } from "@calcom/prisma/client";
import { Button } from "@calcom/ui/components/button";

import { useCreateEventType } from "../../hooks/event-types/private/useCreateEventType";
import { useCreateTeamEventType } from "../../hooks/event-types/private/useCreateTeamEventType";
import { useTeams } from "../../hooks/teams/useTeams";
import { cn } from "../../src/lib/utils";

type ActionButtonsClassNames = {
  container?: string;
  submit?: string;
  cancel?: string;
};

type CreateEventTypeProps = {
  teamId?: number;
  onSuccess?: (eventType: EventType) => void;
  onError?: (error: Error) => void;
  customClassNames?: {
    atomsWrapper?: string;
    buttons?: ActionButtonsClassNames;
  };
  onCancel?: () => void;
};

const ActionButtons = ({
  submitLabel,
  cancelLabel,
  isPending,
  customClassNames,
  onCancel,
}: {
  submitLabel: string;
  cancelLabel: string;
  isPending: boolean;
  customClassNames?: ActionButtonsClassNames;
  onCancel?: () => void;
}) => {
  return (
    <div className={cn("flex flex-row gap-4", customClassNames?.container)}>
      <Button type="submit" loading={isPending} className={customClassNames?.submit}>
        {submitLabel}
      </Button>
      {onCancel && (
        <Button
          color="secondary"
          type="button"
          loading={isPending}
          className={customClassNames?.cancel}
          onClick={() => onCancel()}>
          {cancelLabel}
        </Button>
      )}
    </div>
  );
};

export const CreateEventTypePlatformWrapper = ({
  teamId,
  onSuccess,
  onError,
  customClassNames,
  onCancel,
}: CreateEventTypeProps) => {
  const { form, isManagedEventType } = useCreateEventTypeForm();
  const createEventTypeQuery = useCreateEventType({ onSuccess, onError });
  const createTeamEventTypeQuery = useCreateTeamEventType({ onSuccess, onError });
  const { data: teams } = useTeams();
  const team = teams?.find((t) => t.id === teamId);
  const { t } = useLocale();

  return teamId && team ? (
    <AtomsWrapper customClassName={customClassNames?.atomsWrapper}>
      <TeamEventTypeForm
        teamSlug={team?.slug}
        teamId={teamId}
        isTeamAdminOrOwner={team.role === "ADMIN" || team.role === "OWNER"}
        urlPrefix=""
        isPending={createTeamEventTypeQuery.isPending}
        form={form}
        isManagedEventType={isManagedEventType}
        handleSubmit={(values) => {
          createTeamEventTypeQuery.mutate({
            lengthInMinutes: values.length,
            title: values.title,
            slug: values.slug,
            description: values.description ?? "",
            schedulingType: values.schedulingType ?? "COLLECTIVE",
            hosts: [],
            teamId,
          });
        }}
        SubmitButton={(isPending) =>
          ActionButtons({
            isPending,
            onCancel,
            submitLabel: t("continue"),
            cancelLabel: t("cancel"),
            customClassNames: customClassNames?.buttons,
          })
        }
      />
    </AtomsWrapper>
  ) : (
    <AtomsWrapper customClassName={customClassNames?.atomsWrapper}>
      <CreateEventTypeForm
        urlPrefix=""
        isPending={createEventTypeQuery.isPending}
        form={form}
        isManagedEventType={isManagedEventType}
        handleSubmit={(values) => {
          createEventTypeQuery.mutate({
            lengthInMinutes: values.length,
            title: values.title,
            slug: values.slug,
            description: values.description ?? "",
          });
        }}
        SubmitButton={(isPending) =>
          ActionButtons({
            isPending,
            onCancel,
            submitLabel: t("continue"),
            cancelLabel: t("cancel"),
            customClassNames: customClassNames?.buttons,
          })
        }
      />
    </AtomsWrapper>
  );
};
