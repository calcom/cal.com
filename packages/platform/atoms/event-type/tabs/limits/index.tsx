import { Controller } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { Label, Select } from "@calcom/ui";

import { beforeAndAfterBufferOptions, slotIntervalOptions } from "../../lib/limitsUtils";
import type { FormValues } from "../../types";
import type { EventTypeSetupProps } from "../event-setup/index";

type LimitsProps = {
  eventType: Pick<EventTypeSetupProps, "eventType">;
};

// befor and after event and time-slot intervals can be refactored into one single component
// all of those return a label and a controller
// props would be labelName, labelHtmlFor, controllerName, control, defaultValue,
// render select props isSearchable, onChange, defaultValue and options

export function Limits({ eventType }: LimitsProps) {
  const formMethods = useFormContext<FormValues>();

  return (
    <div>
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        {/* this div contains the exact same component with just different label and different controller name */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          <div className="w-full">
            <Label htmlFor="beforeBufferTime">Before event</Label>
            <Controller
              name="beforeBufferTime"
              control={formMethods.control}
              defaultValue={eventType.beforeEventBuffer || 0}
              render={({ field: { onChange, value } }) => {
                return (
                  <Select
                    isSearchable={false}
                    onChange={(val) => {
                      if (val) onChange(val.value);
                    }}
                    defaultValue={
                      beforeAndAfterBufferOptions.find((option) => option.value === value) ||
                      beforeAndAfterBufferOptions[0]
                    }
                    options={beforeAndAfterBufferOptions}
                  />
                );
              }}
            />
          </div>
          <div className="w-full">
            <Label htmlFor="afterBufferTime">After event</Label>
            <Controller
              name="afterBufferTime"
              control={formMethods.control}
              defaultValue={eventType.afterEventBuffer || 0}
              render={({ field: { onChange, value } }) => {
                return (
                  <Select
                    isSearchable={false}
                    onChange={(val) => {
                      if (val) onChange(val.value);
                    }}
                    defaultValue={
                      beforeAndAfterBufferOptions.find((option) => option.value === value) ||
                      beforeAndAfterBufferOptions[0]
                    }
                    options={beforeAndAfterBufferOptions}
                  />
                );
              }}
            />
          </div>
        </div>
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          <div className="w-full">
            <Label htmlFor="minimumBookingNotice">Minimum Notice</Label>
            {/* TODO: MinimumBookingNoticeInput component goes here */}
          </div>
          <div className="w-full">
            <Label htmlFor="slotInterval">Time-slot intervals</Label>
            <Controller
              name="slotInterval"
              control={formMethods.control}
              render={() => {
                return (
                  <Select
                    isSearchable={false}
                    onChange={(val) => {
                      formMethods.setValue("slotInterval", val && (val.value || 0) > 0 ? val.value : null);
                    }}
                    defaultValue={
                      slotIntervalOptions.find((option) => option.value === eventType.slotInterval) ||
                      slotIntervalOptions[0]
                    }
                    options={slotIntervalOptions}
                  />
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
