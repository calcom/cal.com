import type { TFunction } from "i18next";
import { useMemo, useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { SchedulingType } from "@calcom/prisma/enums";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";

interface FieldPermissionState {
  [fieldName: string]: boolean;
}

interface FieldPermissionConfig {
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata" | "id">;
  translate: TFunction;
  formMethods: UseFormReturn<FormValues>;
}

interface FieldPermissionResult {
  isFieldLocked: (fieldName: string) => boolean;
  isFieldDisabled: (fieldName: string) => boolean;
  getFieldIndicator: (
    fieldName: string
  ) => { text: string; className: string; tooltip: string; icon: string } | null;
  getFieldSwitch: (
    fieldName: string
  ) => { enabled: boolean; onClick: () => void; className: string; testId: string } | null;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  toggleFieldPermission: (fieldName: string, enabled: boolean) => void;
}

export const useFieldPermissions = ({
  eventType,
  translate,
  formMethods,
}: FieldPermissionConfig): FieldPermissionResult => {
  const { setValue, getValues, watch } = formMethods;
  const [fieldStates, setFieldStates] = useState<FieldPermissionState>({});

  // Memoized computed values to prevent unnecessary recalculations
  const computedValues = useMemo(() => {
    const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
    const isChildrenManagedEventType =
      eventType.metadata?.managedEventConfig !== undefined &&
      eventType.schedulingType !== SchedulingType.MANAGED;

    const unlockedFields = eventType.metadata?.managedEventConfig?.unlockedFields || {};

    return {
      isManagedEventType,
      isChildrenManagedEventType,
      unlockedFields,
    };
  }, [eventType.schedulingType, eventType.metadata?.managedEventConfig]);

  // Optimized field state getter with memoization
  const getFieldState = useCallback(
    (fieldName: string): boolean => {
      if (fieldStates[fieldName] !== undefined) {
        return fieldStates[fieldName];
      }

      const { isManagedEventType, isChildrenManagedEventType, unlockedFields } = computedValues;
      let isLocked = isManagedEventType || isChildrenManagedEventType;

      if (isLocked) {
        const fieldIsUnlocked = !!unlockedFields[fieldName];
        isLocked = !fieldIsUnlocked;
      }

      // Update state asynchronously to avoid blocking render
      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: isLocked,
      }));

      return isLocked;
    },
    [fieldStates, computedValues]
  );

  // Optimized field locking check
  const isFieldLocked = useCallback(
    (fieldName: string): boolean => {
      return getFieldState(fieldName);
    },
    [getFieldState]
  );

  // Optimized field disabled check
  const isFieldDisabled = useCallback(
    (fieldName: string): boolean => {
      const { isManagedEventType, isChildrenManagedEventType } = computedValues;

      if (!isManagedEventType && isChildrenManagedEventType) {
        const currentUnlockedFields = watch("metadata.managedEventConfig.unlockedFields") || {};
        const fieldIsUnlocked = !!currentUnlockedFields[fieldName];
        return !fieldIsUnlocked;
      }

      return isFieldLocked(fieldName);
    },
    [isFieldLocked, computedValues, watch]
  );

  // Optimized field permission toggle
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

      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: !enabled,
      }));
    },
    [setValue, getValues]
  );

  // Memoized field indicator data
  const getFieldIndicator = useCallback(
    (fieldName: string) => {
      const { isManagedEventType, isChildrenManagedEventType } = computedValues;

      if (!isManagedEventType && !isChildrenManagedEventType) {
        return null;
      }

      const isLocked = isFieldLocked(fieldName);
      const stateText = translate(isLocked ? "locked" : "unlocked");
      const tooltipText = translate(
        `${isLocked ? "locked" : "unlocked"}_fields_${isManagedEventType ? "admin" : "member"}_description`
      );

      return {
        text: stateText,
        className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          isLocked ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"
        }`,
        tooltip: tooltipText,
        icon: isLocked ? "🔒" : "🔓",
      };
    },
    [computedValues, isFieldLocked, translate]
  );

  // Memoized field switch data
  const getFieldSwitch = useCallback(
    (fieldName: string) => {
      const { isManagedEventType } = computedValues;

      if (!isManagedEventType) {
        return null;
      }

      const isLocked = isFieldLocked(fieldName);

      return {
        enabled: !isLocked,
        onClick: () => toggleFieldPermission(fieldName, !isLocked),
        className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isLocked ? "bg-gray-200" : "bg-blue-600"
        }`,
        testId: `field-permission-toggle-${fieldName}`,
      };
    },
    [computedValues, isFieldLocked, toggleFieldPermission]
  );

  return {
    isFieldLocked,
    isFieldDisabled,
    getFieldIndicator,
    getFieldSwitch,
    isManagedEventType: computedValues.isManagedEventType,
    isChildrenManagedEventType: computedValues.isChildrenManagedEventType,
    toggleFieldPermission,
  };
};

export default useFieldPermissions;
