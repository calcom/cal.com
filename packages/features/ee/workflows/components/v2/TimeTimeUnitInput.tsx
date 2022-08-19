import { TimeUnit } from "@prisma/client";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TextField,
} from "@calcom/ui/v2";

import { getWorkflowTimeUnitOptions } from "../../lib/getOptions";
import type { FormValues } from "../../pages/v2/workflow";

type Props = {
  form: UseFormReturn<FormValues>;
};

export const TimeTimeUnitInput = (props: Props) => {
  const { form } = props;
  const { t } = useLocale();
  const timeUnitOptions = getWorkflowTimeUnitOptions(t);

  const [timeUnit, setTimeUnit] = useState(form.getValues("timeUnit"));

  return (
    <div className="flex">
      <div className="grow">
        <TextField
          type="number"
          min="1"
          label=""
          defaultValue={form.getValues("time") || 24}
          className="-mt-2 rounded-r-none text-sm "
          {...form.register("time", { valueAsNumber: true })}
        />
      </div>
      <div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            {/* arrow down ist missing */}
            <button className="-ml-1 h-9 w-24 rounded-r-md border border-gray-300 bg-gray-50 px-3 py-1 text-sm">
              {timeUnit ? t(`${timeUnit.toLowerCase()}_timeUnit`) : "undefined"}{" "}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {timeUnitOptions.map((option, index) => (
              <DropdownMenuItem key={index} className="outline-none">
                <button
                  key={index}
                  type="button"
                  className="h-8 w-20 justify-start pl-3 text-left text-sm"
                  onClick={() => {
                    setTimeUnit(option.value);
                    form.setValue("timeUnit", option.value);
                  }}>
                  {option.label}
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </div>
  );
};
