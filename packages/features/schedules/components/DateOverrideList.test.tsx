import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, renderHook, screen } from "@testing-library/react";
import { useFieldArray, useForm, FormProvider } from "react-hook-form";
import { describe, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import type { TimeRange } from "@calcom/types/schedule";

import DateOverrideList from "./DateOverrideList";

type FormValues = {
  dateOverrides: { ranges: TimeRange[] }[];
};

vi.mock("next/navigation", () => ({
  ...require("next-router-mock"),
  useSearchParams: () => vi.fn(),
  usePathname: () => "",
  useParams: () => ({}),
  ReadonlyURLSearchParams: URLSearchParams,
}));

describe("DateOverrideList", () => {
  it("renders DateOverrideList component", () => {
    const { result } = renderHook(() =>
      useForm<FormValues>({
        values: {
          dateOverrides: [
            {
              ranges: [
                {
                  start: dayjs.utc().startOf("day").add(540, "minute").toDate(),
                  end: dayjs.utc().startOf("day").add(1020, "minute").toDate(),
                },
              ],
            },
          ],
        },
      })
    );
    const methods = result.current;
    const { control } = methods;

    const { result: fieldArrayResult } = renderHook(() => useFieldArray({ control, name: "dateOverrides" }));
    render(
      <TooltipProvider>
        <FormProvider {...methods}>
          <DateOverrideList
            hour12={false}
            fields={fieldArrayResult.current.fields}
            replace={fieldArrayResult.current.replace}
            workingHours={[]}
          />
        </FormProvider>
      </TooltipProvider>
    );

    screen.debug();
  });
});
