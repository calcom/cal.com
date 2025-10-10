import { cn } from "@calid/features/lib/cn";
import { Badge } from "@calid/features/ui/components/badge";
import { Switch } from "@calid/features/ui/components/switch";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import type { TFunction } from "i18next";
import React, { useMemo, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { SchedulingType } from "@calcom/prisma/enums";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";

interface FieldPermissionConfig {
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata" | "id">;
  translate: TFunction;
  formMethods: UseFormReturn<FormValues>;
}

interface FieldPermissionResult {
  isFieldLocked: (fieldName: string) => boolean;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  toggleFieldPermission: (fieldName: string, enabled: boolean) => void;
  getFieldState: (fieldName: string) => { isLocked: boolean; isDisabled: boolean };
}

export const FieldPermissionIndicator = ({
  fieldName,
  fieldPermissions,
  t,
}: {
  fieldName: string;
  fieldPermissions: ReturnType<typeof useFieldPermissions>;
  t: TFunction;
}): React.ReactElement | null => {
  const { isManagedEventType, isChildrenManagedEventType, isFieldLocked, toggleFieldPermission } =
    fieldPermissions;

  const isLocked = isFieldLocked(fieldName);
  const stateText = t(isLocked ? "locked" : "unlocked");
  const tooltipText = t(
    `${isLocked ? "locked" : "unlocked"}_fields_${isManagedEventType ? "admin" : "member"}_description`
  );

  const handleToggle = (enabled: boolean) => {
    toggleFieldPermission(fieldName, enabled);
  };

  if (!(isManagedEventType || isChildrenManagedEventType)) {
    return null;
  }

  return (
    <Tooltip content={tooltipText}>
      <div className="inline">
        <Badge
          variant={isLocked ? "secondary" : "success"}
          startIcon={isLocked ? "lock" : "lock-open"}
          className={cn("ml-2 transform justify-between gap-1 p-1")}>
          <span className="inline-flex">
            <span className="ml-1 font-medium">{stateText}</span>
          </span>
          {isManagedEventType && (
            <Switch
              data-testid={`field-permission-toggle-${fieldName}`}
              onCheckedChange={handleToggle}
              checked={!isLocked}
              size="sm"
            />
          )}
        </Badge>
      </div>
    </Tooltip>
  );
};

export const useFieldPermissions = ({
  eventType,
  translate: _translate,
  formMethods,
}: FieldPermissionConfig): FieldPermissionResult => {
  const { setValue, getValues, watch } = formMethods;

  const eventTypeInfo = useMemo(() => {
    const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
    const isChildrenManagedEventType =
      eventType.metadata?.managedEventConfig !== undefined &&
      eventType.schedulingType !== SchedulingType.MANAGED;

    return {
      isManagedEventType,
      isChildrenManagedEventType,
    };
  }, [eventType.schedulingType, eventType.metadata?.managedEventConfig]);

  const getFieldState = useCallback(
    (fieldName: string): { isLocked: boolean; isDisabled: boolean } => {
      const { isManagedEventType, isChildrenManagedEventType } = eventTypeInfo;

      // Always check the current form state to ensure we have the latest data
      const currentUnlockedFields = watch("metadata.managedEventConfig.unlockedFields") || {};
      const fieldIsUnlocked = !!currentUnlockedFields[fieldName];

      let isLocked = isManagedEventType || isChildrenManagedEventType;
      if (isLocked) {
        isLocked = !fieldIsUnlocked;
      }

      // For team managed events, fields should never be disabled - always unlocked/editable
      // For children managed events, fields are disabled unless explicitly unlocked
      let isDisabled = false;
      if (!isManagedEventType && isChildrenManagedEventType) {
        isDisabled = !fieldIsUnlocked;
      }

      return { isLocked, isDisabled };
    },
    [eventTypeInfo, watch]
  );

  const isFieldLocked = useCallback(
    (fieldName: string): boolean => {
      return getFieldState(fieldName).isLocked;
    },
    [getFieldState]
  );

  const toggleFieldPermission = useCallback(
    (fieldName: string, enabled: boolean) => {
      const path = "metadata.managedEventConfig.unlockedFields";
      const currentUnlockedFields = getValues(path) || {};

      const updatedFields = enabled
        ? { ...currentUnlockedFields, [fieldName]: true }
        : { ...currentUnlockedFields };

      if (!enabled) {
        delete updatedFields[fieldName];
      }

      setValue(path, updatedFields, { shouldDirty: true });
    },
    [setValue, getValues]
  );

  return {
    isFieldLocked,
    isManagedEventType: eventTypeInfo.isManagedEventType,
    isChildrenManagedEventType: eventTypeInfo.isChildrenManagedEventType,
    toggleFieldPermission,
    getFieldState,
  };
};

export default useFieldPermissions;
