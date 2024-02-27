// eslint-disable-next-line no-restricted-imports
import { get } from "lodash";
import type { TFunction } from "next-i18next";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
import { Tooltip, Badge, Switch } from "@calcom/ui";
import { Lock, Unlock } from "@calcom/ui/components/icon";

export const LockedSwitch = (
  isManagedEventType: boolean,
  [isLocked, setIsLocked]: [boolean, Dispatch<SetStateAction<boolean>>],
  fieldName: string,
  setUnlockedFields: (fieldName: string, val: boolean | undefined) => void,
  options = { simple: false }
) => {
  return isManagedEventType ? (
    <Switch
      data-testid={`locked-indicator-${fieldName}`}
      onCheckedChange={(enabled) => {
        setIsLocked(enabled);
        setUnlockedFields(fieldName, !enabled || undefined);
      }}
      checked={isLocked}
      small={!options.simple}
    />
  ) : null;
};

export const LockedIndicator = (
  isManagedEventType: boolean,
  [isLocked, setIsLocked]: [boolean, Dispatch<SetStateAction<boolean>>],
  t: TFunction,
  fieldName: string,
  setUnlockedFields: (fieldName: string, val: boolean | undefined) => void,
  options = { simple: false }
) => {
  const stateText = t(isLocked ? "locked" : "unlocked");
  const tooltipText = t(
    `${isLocked ? "locked" : "unlocked"}_fields_${isManagedEventType ? "admin" : "member"}_description`
  );
  return (
    <Tooltip content={<>{tooltipText}</>}>
      <div className="inline">
        <Badge variant={isLocked ? "gray" : "green"} className="ml-2 transform gap-1.5 p-1">
          {!options.simple && (
            <>
              {isLocked ? (
                <Lock className="text-subtle h-3 w-3" />
              ) : (
                <Unlock className="text-subtle h-3 w-3" />
              )}
              <span className="font-medium">{stateText}</span>
            </>
          )}
          {isManagedEventType && (
            <Switch
              data-testid={`locked-indicator-${fieldName}`}
              onCheckedChange={(enabled) => {
                setIsLocked(enabled);
                setUnlockedFields(fieldName, !enabled || undefined);
              }}
              checked={isLocked}
              small={!options.simple}
            />
          )}
        </Badge>
      </div>
    </Tooltip>
  );
};

const useLockedFieldsManager = (
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata" | "id">,
  formMethods: UseFormReturn<FormValues>,
  translate: TFunction
) => {
  const fieldStates: Record<string, [boolean, Dispatch<SetStateAction<boolean>>]> = {};
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
    const metaUnlockedFields = formMethods.getValues(path);
    if (!metaUnlockedFields) return;
    if (val === undefined) {
      delete metaUnlockedFields[fieldName as keyof typeof metaUnlockedFields];
      formMethods.setValue(path, { ...metaUnlockedFields }, { shouldDirty: true });
    } else {
      formMethods.setValue(
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
    // Supports "metadata.fieldName"
    if (fieldName.includes(".")) {
      locked = locked && get(unlockedFields, fieldName) === undefined;
    } else {
      locked = locked && unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined;
    }
    return locked;
  };

  const useShouldLockIndicator = (fieldName: string, options?: { simple: true }) => {
    if (!fieldStates[fieldName]) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      fieldStates[fieldName] = useState(getLockedInitState(fieldName));
    }

    return LockedIndicator(
      isManagedEventType,
      fieldStates[fieldName],
      translate,
      fieldName,
      setUnlockedFields,
      options
    );
  };

  const useLockedLabel = (fieldName: string, options?: { simple: true }) => {
    if (!fieldStates[fieldName]) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      fieldStates[fieldName] = useState(getLockedInitState(fieldName));
    }
    const isLocked = fieldStates[fieldName][0];

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
    if (!fieldStates[fieldName]) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      fieldStates[fieldName] = useState(getLockedInitState(fieldName));
    }

    return () =>
      LockedSwitch(isManagedEventType, fieldStates[fieldName], fieldName, setUnlockedFields, options);
  };

  const useShouldLockDisableProps = (fieldName: string, options?: { simple: true }) => {
    if (!fieldStates[fieldName]) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      fieldStates[fieldName] = useState(getLockedInitState(fieldName));
    }
    return {
      disabled:
        !isManagedEventType &&
        eventType.metadata?.managedEventConfig !== undefined &&
        unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined,
      LockedIcon: useShouldLockIndicator(fieldName, options),
      isLocked: fieldStates[fieldName][0],
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
