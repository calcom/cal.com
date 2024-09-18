import { Trans } from "next-i18next";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import type { FormValues, Host } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  Button,
  Label,
  Select,
  TextField,
} from "@calcom/ui";

import type { CheckedSelectOption } from "./CheckedTeamSelect";

interface IDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  option: CheckedSelectOption;
  onChange: (value: readonly CheckedSelectOption[]) => void;
}

export const PriorityDialog = (props: IDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, onChange } = props;
  const { getValues } = useFormContext<FormValues>();

  const priorityOptions = [
    { label: t("lowest"), value: 0 },
    { label: t("low"), value: 1 },
    { label: t("medium"), value: 2 },
    { label: t("high"), value: 3 },
    { label: t("highest"), value: 4 },
  ];

  const [newPriority, setNewPriority] = useState<{ label: string; value: number }>();
  const setPriority = () => {
    if (!!newPriority) {
      const hosts: Host[] = getValues("hosts");
      const isRRWeightsEnabled = getValues("isRRWeightsEnabled");
      const updatedHosts = hosts
        .filter((host) => !host.isFixed)
        .map((host) => {
          return {
            ...option,
            value: host.userId.toString(),
            priority: host.userId === parseInt(option.value, 10) ? newPriority.value : host.priority,
            isFixed: false,
            weight: host.weight,
            weightAdjustment: host.weightAdjustment,
          };
        });

      const sortedHosts = updatedHosts.sort((a, b) => sortHosts(a, b, isRRWeightsEnabled));

      onChange(sortedHosts);
    }
    setIsOpenDialog(false);
  };
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_priority")}>
        <div className="mb-4">
          <Label>{t("priority_for_user", { userName: option.label })}</Label>
          <Select
            defaultValue={priorityOptions[option.priority ?? 2]}
            value={newPriority}
            onChange={(value) => setNewPriority(value ?? priorityOptions[2])}
            options={priorityOptions}
          />
        </div>

        <DialogFooter>
          <DialogClose />
          <Button onClick={setPriority}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const weightDescription = (
  <Trans i18nKey="weights_description">
    Weights determine how meetings are distributed among hosts.
    <Link
      className="underline underline-offset-2"
      target="_blank"
      href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#weights">
      Learn more
    </Link>
  </Trans>
);

export function sortHosts(
  hostA: { priority: number | null; weight: number | null },
  hostB: { priority: number | null; weight: number | null },
  isRRWeightsEnabled: boolean
) {
  const weightA = hostA.weight ?? 100;
  const priorityA = hostA.priority ?? 2;
  const weightB = hostB.weight ?? 100;
  const priorityB = hostB.priority ?? 2;

  if (isRRWeightsEnabled) {
    if (weightA === weightB) {
      return priorityB - priorityA;
    } else {
      return weightB - weightA;
    }
  } else {
    return priorityB - priorityA;
  }
}

export const WeightDialog = (props: IDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, onChange } = props;
  const { getValues } = useFormContext<FormValues>();
  const [newWeight, setNewWeight] = useState<number>(100);

  const setWeight = () => {
    const hosts: Host[] = getValues("hosts");
    const updatedHosts = hosts
      .filter((host) => !host.isFixed)
      .map((host) => {
        return {
          ...option,
          value: host.userId.toString(),
          priority: host.priority,
          weight: host.userId === parseInt(option.value, 10) ? newWeight : host.weight,
          isFixed: false,
          weightAdjustment: host.weightAdjustment,
        };
      });

    const sortedHosts = updatedHosts.sort((a, b) => sortHosts(a, b, true));

    onChange(sortedHosts);
    setIsOpenDialog(false);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_weight")} description={weightDescription}>
        <div className="mb-4 mt-2">
          <Label>{t("weight_for_user", { userName: option.label })}</Label>
          <div className="w-36">
            <TextField
              required
              min={0}
              label={t("Weight")}
              value={newWeight}
              type="number"
              onChange={(e) => setNewWeight(parseInt(e.target.value))}
              addOnSuffix={<>%</>}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose />
          <Button onClick={setWeight}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
