import { SchedulingType } from "@prisma/client";
import { get } from "lodash";
import React from "react";
import type z from "zod";

import type { Prisma } from "@calcom/prisma/client";
import type { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
import { Tooltip } from "@calcom/ui";
import { FiLock } from "@calcom/ui/components/icon";

const Indicator = (label: string) => (
  <Tooltip content={<>{label}</>}>
    <div className="ml-1 -mt-0.5 inline-flex h-4 w-4 rounded-sm bg-gray-100 p-0.5">
      <FiLock className="h-3 w-3 text-gray-500 hover:text-black" />
    </div>
  </Tooltip>
);

const useLockedFieldsManager = (
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata">,
  adminLabel: string,
  memberLabel: string
) => {
  const unlockedFields =
    (eventType.metadata?.managedEventConfig?.unlockedFields !== undefined &&
      eventType.metadata?.managedEventConfig?.unlockedFields) ||
    {};

  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const isChildrenManagedEventType =
    eventType.metadata?.managedEventConfig !== undefined &&
    eventType.schedulingType !== SchedulingType.MANAGED;

  const shouldLockIndicator = (fieldName: string) => {
    let locked = isManagedEventType || isChildrenManagedEventType;
    // Supports "metadata.fieldName"
    if (fieldName.includes(".")) {
      locked = locked && get(unlockedFields, fieldName) === undefined;
    } else {
      locked = locked && unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined;
    }
    return locked && Indicator(isManagedEventType ? adminLabel : memberLabel);
  };

  const shouldLockDisableProps = (fieldName: string) => {
    return {
      disabled:
        !isManagedEventType &&
        eventType.metadata?.managedEventConfig !== undefined &&
        unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined,
      LockedIcon: shouldLockIndicator(fieldName),
    };
  };

  return { shouldLockIndicator, shouldLockDisableProps, isManagedEventType, isChildrenManagedEventType };
};

export default useLockedFieldsManager;
