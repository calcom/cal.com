import { SchedulingType } from "@prisma/client";
import React from "react";
import z from "zod";

import { Prisma } from "@calcom/prisma/client";
import { _EventTypeModel } from "@calcom/prisma/zod/eventtype";
import { Tooltip } from "@calcom/ui";
import { FiLock } from "@calcom/ui/components/icon";

export default class LockedFieldsManager {
  public eventType: Partial<z.infer<typeof _EventTypeModel>>;
  constructor(eventType: Partial<z.infer<typeof _EventTypeModel>>) {
    this.eventType = eventType;
  }
  public getLockedFields() {
    return (
      (this.eventType.metadata?.managedEventConfig?.lockedFields !== undefined &&
        this.eventType.metadata?.managedEventConfig?.lockedFields) ||
      {}
    );
  }
  public disabledFields() {
    return this.eventType.schedulingType === SchedulingType.MANAGED && this.eventType.userId !== null;
  }
  public getLockedIndicator(label: string) {
    return (
      <Tooltip content={<>{label}</>}>
        <div className="ml-1 -mt-0.5 inline-flex h-4 w-4 rounded-sm bg-gray-100 p-0.5">
          <FiLock className="h-3 w-3 text-gray-500 hover:text-black" />
        </div>
      </Tooltip>
    );
  }
  public shouldLockDisable(fieldName: string, label: string): React.ReactNode;
  public shouldLockDisable(fieldName: string, label?: undefined): boolean;
  public shouldLockDisable(fieldName: string, label?: string) {
    const disabled = this.disabledFields();
    const locked = this.getLockedFields()[fieldName as keyof Prisma.EventTypeSelect] === true;
    return label ? locked && !disabled && this.getLockedIndicator(label) : locked && disabled;
  }
  public shouldLockDisableProps(fieldName: string, label: string) {
    const indicator = this.shouldLockDisable(fieldName, label);
    return {
      disabled: !indicator,
      isLocked: indicator,
    };
  }
}
