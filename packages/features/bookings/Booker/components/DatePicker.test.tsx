import { render } from "@testing-library/react";
import { vi, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { DatePicker as DatePickerComponent } from "@calcom/features/calendars/DatePicker";

import { DatePicker } from "./DatePicker";

vi.mock("@calcom/features/calendars/DatePicker", () => {
  return {
    DatePicker: vi.fn(() => <div data-testid="mock-date-picker" />),
  };
});

const noop = () => {
  /* noop */
};

describe("Tests for DatePicker Component", () => {
  afterEach(() => {
    DatePickerComponent.mockClear();
  });

  test("It passes the loading prop to the DatePicker component", async () => {
    render(<DatePicker event={{}} isLoading={true} />);

    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: true,
      }),
      expect.anything()
    );
  });

  test("happy path, slots in current month", async () => {
    // today current time.
    const testDate = dayjs();
    render(
      <DatePicker
        event={{}}
        slots={{
          [`${testDate.format("YYYY-MM-DD")}`]: [
            {
              time: testDate.format("YYYY-MM-DDTHH:mm:ss"),
            },
          ],
        }}
        isLoading={false}
      />
    );
    // slot date is next month, so it'll have skipped the current month
    // by setting the browsingDate to the next month.
    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        browsingDate: dayjs().startOf("month"),
      }),
      expect.anything()
    );
  });

  test("when there are only slots in the next month, skip the current month", async () => {
    // there'll be one slot open on this day, next month.
    const slotDate = dayjs().add("1", "month");
    render(
      <DatePicker
        event={{}}
        slots={{
          [`${slotDate.format("YYYY-MM-DD")}`]: [
            {
              time: slotDate.format("YYYY-MM-DDTHH:mm:ss"),
            },
          ],
        }}
        isLoading={false}
      />
    );
    // slot date is next month, so it'll have skipped the current month
    // by setting the browsingDate to the next month.
    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        browsingDate: slotDate.startOf("month"),
      }),
      expect.anything()
    );
  });

  test("when there are no slots, check for infinite loop (skip only 1 month)", async () => {
    render(
      <DatePicker
        event={{}}
        slots={
          {
            /* no slots given at all, but not loading */
          }
        }
        isLoading={false}
      />
    );
    // slot date is next month, so it'll have skipped the current month
    // by setting the browsingDate to the next month.
    expect(DatePickerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        browsingDate: dayjs().add("1", "month").startOf("month"),
      }),
      expect.anything()
    );
  });
});
