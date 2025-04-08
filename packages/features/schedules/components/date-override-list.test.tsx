import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, renderHook, screen } from "@testing-library/react";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { useFieldArray, useForm, FormProvider } from "react-hook-form";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";
import DateOverrideList from "@calcom/features/schedules/components/DateOverrideList";
import type { TimeRange } from "@calcom/types/schedule";

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(() => {
        return;
      }),
    })),
  };
});

type FormValues = {
  dateOverrides: { ranges: TimeRange[] }[];
};

describe("DateOverrideList", () => {
  it("renders DateOverrideList component in military time", () => {
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
            userTimeFormat={24}
            fields={fieldArrayResult.current.fields}
            replace={fieldArrayResult.current.replace}
            workingHours={[]}
            handleAvailabilityUpdate={noop}
          />
        </FormProvider>
      </TooltipProvider>
    );

    const dateString = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date());

    expect(screen.getByText(dateString)).toBeInTheDocument();
    expect(screen.getByText(`09:00 - 17:00`)).toBeInTheDocument();
  });

  it("renders DateOverrideList component in AM/PM", () => {
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
            hour12={true}
            userTimeFormat={12}
            fields={fieldArrayResult.current.fields}
            replace={fieldArrayResult.current.replace}
            workingHours={[]}
            handleAvailabilityUpdate={noop}
          />
        </FormProvider>
      </TooltipProvider>
    );

    const dateString = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date());

    expect(screen.getByText(dateString)).toBeInTheDocument();
    expect(screen.getByText(`9:00 AM - 5:00 PM`)).toBeInTheDocument();
  });
});
