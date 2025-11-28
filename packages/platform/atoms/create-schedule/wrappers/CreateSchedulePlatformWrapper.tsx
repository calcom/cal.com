import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ApiErrorResponse } from "@calcom/platform-types";
import { Button } from "@calcom/ui/components/button";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { CreateScheduleForm } from "../CreateScheduleForm";
import { ActionButtonsClassNames } from "../CreateScheduleForm";

export const CreateSchedulePlatformWrapper = ({
  name,
  customClassNames,
  onSuccess,
  onError,
  disableToasts = false,
}: {
  name?: string;
  onSuccess?: (scheduleId: number) => void;
  onError?: (err: ApiErrorResponse) => void;
  customClassNames?: {
    createScheduleButton?: string;
    inputField?: string;
    formWrapper?: string;
    actionsButtons?: ActionButtonsClassNames;
  };
  disableToasts?: boolean;
}) => {
  const { t } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <AtomsWrapper>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            data-testid={name}
            className={customClassNames?.createScheduleButton}
            StartIcon="plus"
            onClick={() => setIsDialogOpen(true)}>
            {name ?? t("new")}
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-default text-default">
          <CreateScheduleForm
            customClassNames={{
              formWrapper: customClassNames?.formWrapper,
              inputField: customClassNames?.inputField,
              actionsButtons: {
                container: customClassNames?.actionsButtons?.container,
                continue: customClassNames?.actionsButtons?.continue,
                close: customClassNames?.actionsButtons?.close,
              },
            }}
            onSuccess={(scheduleId) => {
              setIsDialogOpen(false);
              onSuccess?.(scheduleId);
            }}
            onError={onError}
            onCancel={() => setIsDialogOpen(false)}
            disableToasts={disableToasts}
          />
        </DialogContent>
      </Dialog>
    </AtomsWrapper>
  );
};
