import { render } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import { DatePicker } from "../DatePicker";

vi.mock("zustand/shallow", () => ({
  shallow: (a: any, b: any) => {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object") return false;
    if (a === null || b === null) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      return a[key] === b[key];
    });
  },
}));

vi.mock("@calcom/features/bookings/Booker/store", () => ({
  useBookerStore: (selector: any) => {
    const state = {
      selectedDatesAndTimes: {},
      bookingData: null,
    };
    return selector(state);
  },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
    },
  }),
}));

vi.mock("@calcom/trpc/react/hooks/useMeQuery", () => ({
  default: () => ({
    data: {
      isTeamAdminOrOwner: false,
    },
  }),
}));

vi.mock("@trpc/react-query", () => ({
  createTRPCReact: () => ({
    useContext: () => ({
      viewer: {
        me: {
          get: {
            useQuery: () => ({
              data: {
                isTeamAdminOrOwner: false,
              },
            }),
          },
        },
      },
    }),
  }),
}));

const noop = () => {
  /* noop */
};

const defaultPeriodData = {
  periodType: PeriodType.UNLIMITED,
  periodDays: null,
  periodCountCalendarDays: false,
  periodStartDate: null,
  periodEndDate: null,
};

describe("Tests for DatePicker Component", () => {
  test("Should render correctly with default date", async () => {
    const testDate = dayjs("2024-02-20");
    const { getByTestId } = render(
      <DatePicker onChange={noop} browsingDate={testDate} locale="en" periodData={defaultPeriodData} />
    );

    const selectedMonthLabel = getByTestId("selected-month-label");
    await expect(selectedMonthLabel).toHaveAttribute("dateTime", testDate.format("YYYY-MM"));
  });

  test("Should render with the minimum date if browsingDate < minDate", async () => {
    const testDate = dayjs("2024-02-20");
    const minDate = dayjs("2025-02-10");
    const { getByTestId } = render(
      <DatePicker
        onChange={noop}
        browsingDate={testDate}
        minDate={minDate.toDate()}
        locale="en"
        periodData={defaultPeriodData}
      />
    );

    const selectedMonthLabel = getByTestId("selected-month-label");
    await expect(selectedMonthLabel).toHaveAttribute("dateTime", minDate.format("YYYY-MM"));
  });

  test("Should render with the browsingDate date if browsingDate >= minDate", async () => {
    const testDate = dayjs("2025-03-20");
    const minDate = dayjs("2025-02-10");
    const { getByTestId } = render(
      <DatePicker
        onChange={noop}
        browsingDate={testDate}
        minDate={minDate.toDate()}
        locale="en"
        periodData={defaultPeriodData}
      />
    );

    const selectedMonthLabel = getByTestId("selected-month-label");
    await expect(selectedMonthLabel).toHaveAttribute("dateTime", testDate.format("YYYY-MM"));
  });
});
