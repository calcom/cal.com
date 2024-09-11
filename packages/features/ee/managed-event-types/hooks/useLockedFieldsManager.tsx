// eslint-disable-next-line no-restricted-imports
import { get } from "lodash";
import type { TFunction } from "next-i18next";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
import { Badge, Icon, Switch, Tooltip } from "@calcom/ui";

export const LockedSwitch = (
  isManagedEventType: boolean,
  [fieldState, setFieldState]: [Record<string, boolean>, Dispatch<SetStateAction<Record<string, boolean>>>],
  fieldName: string,
  setUnlockedFields: (fieldName: string, val: boolean | undefined) => void,
  options = { simple: false }
) => {
  return isManagedEventType ? (
    <Switch
      data-testid={`locked-indicator-${fieldName}`}
      onCheckedChange={(enabled) => {
        setFieldState({
          ...fieldState,
          [fieldName]: enabled,
        });
        setUnlockedFields(fieldName, !enabled || undefined);
      }}
      checked={fieldState[fieldName]}
      small={!options.simple}
    />
  ) : null;
};

export const LockedIndicator = (
  isChildrenManagedEventType: boolean,
  isManagedEventType: boolean,
  [fieldState, setFieldState]: [Record<string, boolean>, Dispatch<SetStateAction<Record<string, boolean>>>],
  t: TFunction,
  fieldName: string,
  setUnlockedFields: (fieldName: string, val: boolean | undefined) => void,
  options = { simple: false }
) => {
  const isLocked = fieldState[fieldName];
  const stateText = t(isLocked ? "locked" : "unlocked");
  const tooltipText = t(
    `${isLocked ? "locked" : "unlocked"}_fields_${isManagedEventType ? "admin" : "member"}_description`
  );

  return (
    (isManagedEventType || isChildrenManagedEventType) && (
      <Tooltip content={<>{tooltipText}</>}>
        <div className="inline">
          <Badge
            variant={isLocked ? "gray" : "green"}
            className={classNames(
              "ml-2 transform justify-between gap-1.5 p-1",
              isManagedEventType && !options.simple && "w-28"
            )}>
            {!options.simple && (
              <span className="inline-flex">
                <Icon name={isLocked ? "lock" : "lock-open"} className="text-subtle h-3 w-3" />
                <span className="ml-1 font-medium">{stateText}</span>
              </span>
            )}
            {isManagedEventType && (
              <Switch
                data-testid={`locked-indicator-${fieldName}`}
                onCheckedChange={(enabled) => {
                  setFieldState({
                    ...fieldState,
                    [fieldName]: enabled,
                  });
                  setUnlockedFields(fieldName, !enabled || undefined);
                }}
                checked={isLocked}
                small={!options.simple}
              />
            )}
          </Badge>
        </div>
      </Tooltip>
    )
  );
};

const useLockedFieldsManager = ({
  eventType,
  translate,
  formMethods,
}: {
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata" | "id">;
  translate: TFunction;
  formMethods: UseFormReturn<FormValues>;
}) => {
  const { setValue, getValues } = formMethods;
  const [fieldStates, setFieldStates] = useState<Record<string, boolean>>({});
  const unlockedFields =
    (eventType.metadata?.managedEventConfig?.unlockedFields !== undefined &&
      eventType.metadata?.managedEventConfig?.unlockedFields) ||
    {};

  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const isChildrenManagedEventType =
    eventType.metadata?.managedEventConfig !== undefined &&
    eventType.schedulingType !== SchedulingType.MANAGED;

  const setUnlockedFields = (fieldName: string, val: boolean | undefined) => {
    const path = "metadata.managedEventConfig.unlockedFields";
    const metaUnlockedFields = getValues(path);
    if (!metaUnlockedFields) return;
    if (val === undefined) {
      delete metaUnlockedFields[fieldName as keyof typeof metaUnlockedFields];
      setValue(path, { ...metaUnlockedFields }, { shouldDirty: true });
    } else {
      setValue(
        path,
        {
          ...metaUnlockedFields,
          [fieldName]: val,
        },
        { shouldDirty: true }
      );
    }
  };

  const getLockedInitState = (fieldName: string): boolean => {
    let locked = isManagedEventType || isChildrenManagedEventType;

    if (fieldName.includes(".")) {
      locked = locked && get(unlockedFields, fieldName) === undefined;
    } else {
      type FieldName = string;
      const unlockedFieldList = getValues("metadata")?.managedEventConfig?.unlockedFields as
        | Record<FieldName, boolean>
        | undefined;
      const fieldIsUnlocked = !!unlockedFieldList?.[fieldName];
      locked = locked && !fieldIsUnlocked;
    }
    return locked;
  };

  const useShouldLockIndicator = (fieldName: string, options?: { simple: true }) => {
    if (typeof fieldStates[fieldName] === "undefined") {
      setFieldStates({
        ...fieldStates,
        [fieldName]: getLockedInitState(fieldName),
      });
    }
    return LockedIndicator(
      isChildrenManagedEventType,
      isManagedEventType,
      [fieldStates, setFieldStates],
      translate,
      fieldName,
      setUnlockedFields,
      options
    );
  };

  const useLockedLabel = (fieldName: string, options?: { simple: true }) => {
    if (typeof fieldStates[fieldName] === "undefined") {
      setFieldStates({
        ...fieldStates,
        [fieldName]: getLockedInitState(fieldName),
      });
    }
    const isLocked = fieldStates[fieldName];
    return {
      disabled:
        !isManagedEventType &&
        eventType.metadata?.managedEventConfig !== undefined &&
        unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined,
      LockedIcon: useShouldLockIndicator(fieldName, options),
      isLocked,
    };
  };

  const useLockedSwitch = (fieldName: string, options = { simple: false }) => {
    if (typeof fieldStates[fieldName] === "undefined") {
      setFieldStates({
        ...fieldStates,
        [fieldName]: getLockedInitState(fieldName),
      });
    }
    return () =>
      LockedSwitch(isManagedEventType, [fieldStates, setFieldStates], fieldName, setUnlockedFields, options);
  };

  const useShouldLockDisableProps = (fieldName: string, options?: { simple: true }) => {
    if (typeof fieldStates[fieldName] === "undefined") {
      setFieldStates({
        ...fieldStates,
        [fieldName]: getLockedInitState(fieldName),
      });
    }
    return {
      disabled:
        !isManagedEventType &&
        eventType.metadata?.managedEventConfig !== undefined &&
        unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined,
      LockedIcon: useShouldLockIndicator(fieldName, options),
      isLocked: fieldStates[fieldName],
    };
  };

  return {
    shouldLockIndicator: useShouldLockIndicator,
    shouldLockDisableProps: useShouldLockDisableProps,
    useLockedLabel,
    useLockedSwitch,
    isManagedEventType,
    isChildrenManagedEventType,
  };
};

export default useLockedFieldsManager;
