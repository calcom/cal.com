import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import type { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";
import { Alert, RadioGroup as RadioArea } from "@calcom/ui";

export const TeamEventAssignmentSection = ({
  isAdmin,
  form,
}: {
  isAdmin: boolean;
  form: UseFormReturn<z.infer<typeof createEventTypeInput>>;
}) => {
  const { t } = useLocale();
  const { register, setValue, formState } = form;

  return (
    <div className="mb-4">
      <label htmlFor="schedulingType" className="text-default block text-sm font-bold">
        {t("assignment")}
      </label>
      {formState.errors.schedulingType && (
        <Alert className="mt-1" severity="error" message={formState.errors.schedulingType.message} />
      )}
      <RadioArea.Group
        onValueChange={(val: SchedulingType) => {
          setValue("schedulingType", val);
        }}
        className={classNames("mt-1 flex gap-4", isAdmin && "flex-col")}>
        <RadioArea.Item
          {...register("schedulingType")}
          value={SchedulingType.COLLECTIVE}
          className={classNames("w-full text-sm", !isAdmin && "w-1/2")}
          classNames={{ container: classNames(isAdmin && "w-full") }}>
          <strong className="mb-1 block">{t("collective")}</strong>
          <p>{t("collective_description")}</p>
        </RadioArea.Item>
        <RadioArea.Item
          {...register("schedulingType")}
          value={SchedulingType.ROUND_ROBIN}
          className={classNames("text-sm", !isAdmin && "w-1/2")}
          classNames={{ container: classNames(isAdmin && "w-full") }}>
          <strong className="mb-1 block">{t("round_robin")}</strong>
          <p>{t("round_robin_description")}</p>
        </RadioArea.Item>
        {isAdmin && (
          <RadioArea.Item
            {...register("schedulingType")}
            value={SchedulingType.MANAGED}
            className={classNames("text-sm", !isAdmin && "w-1/2")}
            classNames={{ container: classNames(isAdmin && "w-full") }}
            data-testid="managed-event-type">
            <strong className="mb-1 block">{t("managed_event")}</strong>
            <p>{t("managed_event_description")}</p>
          </RadioArea.Item>
        )}
      </RadioArea.Group>
    </div>
  );
};
