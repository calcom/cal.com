import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ApiErrorResponse } from "@calcom/platform-types";
import { Button } from "@calcom/ui/components/button";
import { Form, InputField } from "@calcom/ui/components/form";
import { useForm } from "react-hook-form";
import { useAtomCreateSchedule } from "../hooks/schedules/useAtomCreateSchedule";
import { AtomsWrapper } from "../src/components/atoms-wrapper";
import { useToast } from "../src/components/ui/use-toast";
import { cn } from "../src/lib/utils";

export type ActionButtonsClassNames = {
  container?: string;
  continue?: string;
  close?: string;
};

export const CreateScheduleForm = ({
  onSuccess,
  onError,
  onCancel,
  customClassNames,
  disableToasts = false,
}: {
  onSuccess?: (scheduleId: number) => void;
  onError?: (err: ApiErrorResponse) => void;
  onCancel?: () => void;
  customClassNames?: {
    formWrapper?: string;
    inputField?: string;
    actionsButtons?: ActionButtonsClassNames;
  };
  disableToasts?: boolean;
}) => {
  const { toast } = useToast();
  const { t } = useLocale();
  const form = useForm<{
    name: string;
  }>();
  const { register } = form;

  const { mutateAsync: createSchedule, isPending: isCreateSchedulePending } = useAtomCreateSchedule({
    onSuccess: (res) => {
      if (!disableToasts) {
        toast({
          description: t("schedule_created_successfully", { scheduleName: res.data.schedule.name }),
        });
      }
      form.reset();
      onSuccess?.(res.data.schedule.id);
    },
    onError: (err) => {
      onError?.(err);
      if (!disableToasts) {
        toast({
          description: `Could not create schedule: ${err.error.message}`,
        });
      }
    },
  });

  return (
    <AtomsWrapper>
      <Form
        className={customClassNames?.formWrapper}
        form={form}
        handleSubmit={async (values) => {
          await createSchedule(values);
        }}>
        <InputField
          className={customClassNames?.inputField}
          label={t("name")}
          type="text"
          id="name"
          required
          placeholder={t("default_schedule_name")}
          {...register("name", {
            setValueAs: (v) => (!v || v.trim() === "" ? null : v),
          })}
        />
        <div
          className={cn(
            "mt-5 justify-end space-x-2 rtl:space-x-reverse sm:mt-4 sm:flex",
            customClassNames?.actionsButtons?.container
          )}>
          {onCancel && (
            <Button
              type="button"
              color="secondary"
              onClick={onCancel}
              className={customClassNames?.actionsButtons?.close}>
              {t("close")}
            </Button>
          )}
          <Button
            type="submit"
            loading={isCreateSchedulePending}
            className={customClassNames?.actionsButtons?.continue}>
            {" "}
            {t("continue")}
          </Button>
        </div>
      </Form>
    </AtomsWrapper>
  );
};
