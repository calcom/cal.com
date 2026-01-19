import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { Options } from "react-select";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import type {
  FormValues,
  Host,
  InputClassNames,
  SelectClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { groupHostsByGroupId, getHostsFromOtherGroups, sortHosts } from "@calcom/lib/bookings/hostGroupUtils";
import { DEFAULT_GROUP_ID } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import WeightDescription from "@calcom/features/eventtypes/components/WeightDescription";

interface IDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  option: CheckedSelectOption;
  options: Options<CheckedSelectOption>;
  onChange: (value: readonly CheckedSelectOption[]) => void;
}

export type PriorityDialogCustomClassNames = SelectClassNames & {
  confirmButton?: string;
};

export const PriorityDialog = (
  props: IDialog & {
    customClassNames?: PriorityDialogCustomClassNames;
  }
) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, options, onChange, customClassNames } = props;
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
      const hostGroups = getValues("hostGroups");
      const rrHosts = hosts.filter((host) => !host.isFixed);

      const groupedHosts = groupHostsByGroupId({ hosts: rrHosts, hostGroups });

      let sortedHostGroup: CheckedSelectOption[] = [];

      const hostGroupToSort = groupedHosts[option.groupId ?? DEFAULT_GROUP_ID];

      if (hostGroupToSort) {
        sortedHostGroup = hostGroupToSort
          .map((host) => {
            return {
              ...option,
              value: host.userId.toString(),
              priority: host.userId === parseInt(option.value, 10) ? newPriority.value : host.priority,
              isFixed: false,
              weight: host.weight,
              groupId: host.groupId,
              userId: host.userId,
            };
          })
          .sort((a, b) => sortHosts(a, b, isRRWeightsEnabled));
      }

      const otherGroupsHosts = getHostsFromOtherGroups(rrHosts, option.groupId);

      const otherGroupsOptions = otherGroupsHosts.map((host) => {
        return {
          ...option,
          value: host.userId.toString(),
          priority: host.priority,
          weight: host.weight,
          isFixed: host.isFixed,
          groupId: host.groupId,
          userId: host.userId,
        };
      });
      const updatedHosts = [...otherGroupsOptions, ...sortedHostGroup];
      onChange(updatedHosts);
    }
    setIsOpenDialog(false);
  };
  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_priority")}>
        <div className={classNames("mb-4", customClassNames?.container)}>
          <Label className={customClassNames?.label}>
            {t("priority_for_user", { userName: option.label })}
          </Label>
          <Select
            defaultValue={priorityOptions[option.priority ?? 2]}
            className={customClassNames?.select}
            innerClassNames={customClassNames?.innerClassNames}
            value={newPriority}
            onChange={(value) => setNewPriority(value ?? priorityOptions[2])}
            options={priorityOptions}
          />
        </div>

        <DialogFooter>
          <DialogClose onClick={() => setNewPriority(undefined)} />
          <Button onClick={setPriority} className={customClassNames?.confirmButton}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export type WeightDialogCustomClassNames = {
  container?: string;
  label?: string;
  confirmButton?: string;
  weightInput?: InputClassNames;
};
export const WeightDialog = (props: IDialog & { customClassNames?: WeightDialogCustomClassNames }) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, option, options, onChange, customClassNames } = props;
  const { getValues } = useFormContext<FormValues>();
  const [newWeight, setNewWeight] = useState<number | undefined>();

  const setWeight = () => {
    if (!!newWeight) {
      const hosts: Host[] = getValues("hosts");
      const isRRWeightsEnabled = getValues("isRRWeightsEnabled");
      const hostGroups = getValues("hostGroups");
      const rrHosts = hosts.filter((host) => !host.isFixed);

      const groupedHosts = groupHostsByGroupId({ hosts: rrHosts, hostGroups });

      const updateHostWeight = (host: Host) => {
        if (host.userId === parseInt(option.value, 10)) {
          return { ...host, weight: newWeight };
        }
        return host;
      };

      // Sort hosts within the group
      let sortedHostGroup: (Host & {
        avatar: string;
        label: string;
      })[] = [];

      const hostGroupToSort = groupedHosts[option.groupId ?? DEFAULT_GROUP_ID];

      if (hostGroupToSort) {
        sortedHostGroup = hostGroupToSort
          .map((host) => {
            const userOption = options.find((opt) => opt.value === host.userId.toString());
            const updatedHost = updateHostWeight(host);
            return {
              ...updatedHost,
              avatar: userOption?.avatar ?? "",
              label: userOption?.label ?? host.userId.toString(),
            };
          })
          .sort((a, b) => sortHosts(a, b, isRRWeightsEnabled));
      }

      const updatedOptions = sortedHostGroup.map((host) => ({
        avatar: host.avatar,
        label: host.label,
        value: host.userId.toString(),
        priority: host.priority,
        weight: host.weight,
        isFixed: host.isFixed,
        groupId: host.groupId,
      }));

      // Preserve hosts from other groups
      const otherGroupsHosts = getHostsFromOtherGroups(rrHosts, option.groupId);

      const otherGroupsOptions = otherGroupsHosts.map((host) => {
        const userOption = options.find((opt) => opt.value === host.userId.toString());
        return {
          avatar: userOption?.avatar ?? "",
          label: userOption?.label ?? host.userId.toString(),
          value: host.userId.toString(),
          priority: host.priority,
          weight: host.weight,
          isFixed: host.isFixed,
          groupId: host.groupId,
        };
      });
      const newFullValue = [...otherGroupsOptions, ...updatedOptions];
      onChange(newFullValue);
    }
    setIsOpenDialog(false);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("set_weight")} description={<WeightDescription t={t} />}>
        <div className={classNames("mb-4 mt-2", customClassNames?.container)}>
          <Label className={customClassNames?.label}>
            {t("weight_for_user", { userName: option.label })}
          </Label>
          <div className={classNames("w-36", customClassNames?.weightInput?.container)}>
            <TextField
              required
              min={0}
              className={customClassNames?.weightInput?.input}
              labelClassName={customClassNames?.weightInput?.label}
              addOnClassname={customClassNames?.weightInput?.addOn}
              label={t("Weight")}
              value={newWeight}
              defaultValue={option.weight ?? 100}
              type="number"
              onChange={(e) => setNewWeight(parseInt(e.target.value))}
              addOnSuffix={<>%</>}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose onClick={() => setNewWeight(undefined)} />
          <Button onClick={setWeight} className={customClassNames?.confirmButton}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
