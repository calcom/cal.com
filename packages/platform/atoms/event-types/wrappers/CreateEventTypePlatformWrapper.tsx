import CreateEventTypeForm from "@calcom/features/eventtypes/components/CreateEventTypeForm";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { EventType } from "@calcom/prisma/client";
import { Button } from "@calcom/ui/components/button";
import { useCreateEventType } from "../../hooks/event-types/private/useCreateEventType";
import { useCreateEventTypeForm } from "../../hooks/event-types/private/useCreateEventTypeForm";
import { cn } from "../../src/lib/utils";
import { AtomsWrapper } from "@/components/atoms-wrapper";

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
  isDryRun?: boolean;
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
  isDryRun = false,
}: CreateEventTypeProps) => {
  const { form, isManagedEventType } = useCreateEventTypeForm();
  const createEventTypeQuery = useCreateEventType({ onSuccess, onError });
  const { t } = useLocale();


  return (
    <AtomsWrapper customClassName={customClassNames?.atomsWrapper}>
      <CreateEventTypeForm
        urlPrefix=""
        isPending={createEventTypeQuery.isPending}
        form={form}
        isManagedEventType={isManagedEventType}
        handleSubmit={(values) => {
          !isDryRun &&
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
