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

const lockedFieldsManager = (
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata">,
  label: string
) => {
  const shouldLockIndicator = (fieldName: string) => {
    let locked = eventType.schedulingType === SchedulingType.MANAGED;
    if (!locked) return false;
    const unlockedFields =
      (eventType.metadata?.managedEventConfig?.unlockedFields !== undefined &&
        eventType.metadata?.managedEventConfig?.unlockedFields) ||
      {};
    // Supports "metadata.fieldName"
    if (fieldName.includes(".")) {
      locked = get(unlockedFields, fieldName) === undefined;
    } else {
      locked = unlockedFields[fieldName as keyof Omit<Prisma.EventTypeSelect, "id">] === undefined;
    }
    return locked && Indicator(label);
  };

  const shouldLockDisableProps = (fieldName: string) => {
    const lala = {
      disabled: eventType.schedulingType === SchedulingType.MANAGED && eventType.userId !== null,
      isLocked: shouldLockIndicator(fieldName),
    };
    return lala;
  };

  return { shouldLockIndicator, shouldLockDisableProps };
};

export default lockedFieldsManager;
