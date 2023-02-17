import { SchedulingType } from "@prisma/client";
import React from "react";
import z from "zod";

import { Prisma } from "@calcom/prisma/client";
import { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
import { Tooltip } from "@calcom/ui";
import { FiLock } from "@calcom/ui/components/icon";

const lockedFieldsManager = (
  eventType: Pick<z.infer<typeof _EventTypeModel>, "schedulingType" | "userId" | "metadata">
) => {
  const Indicator = (label: string) => (
    <Tooltip content={<>{label}</>}>
      <div className="ml-1 -mt-0.5 inline-flex h-4 w-4 rounded-sm bg-gray-100 p-0.5">
        <FiLock className="h-3 w-3 text-gray-500 hover:text-black" />
      </div>
    </Tooltip>
  );

  const regular = {
    shouldLockDisable: (
      fieldName: string,
      label?: string
    ): typeof label extends undefined ? boolean : React.ReactNode => {
      const disabled = eventType.schedulingType === SchedulingType.MANAGED && eventType.userId !== null;
      const lockedFields =
        (eventType.metadata?.managedEventConfig?.lockedFields !== undefined &&
          eventType.metadata?.managedEventConfig?.lockedFields) ||
        {};
      const locked = lockedFields[fieldName as keyof Prisma.EventTypeSelect] === true;
      return label ? locked && !disabled && Indicator(label) : locked && disabled;
    },
  };

  const advanced = {
    shouldLockDisableProps: (fieldName: string, label: string) => {
      const indicator = regular.shouldLockDisable(fieldName, label);
      return {
        disabled: !indicator,
        isLocked: indicator,
      };
    },
  };

  return { ...regular, ...advanced };
};

export default lockedFieldsManager;
