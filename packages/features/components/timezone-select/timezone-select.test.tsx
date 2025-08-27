/* eslint-disable playwright/missing-playwright-await */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Props as SelectProps } from "react-timezone-select";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";

import { TimezoneSelect } from "./TimezoneSelect";

const cityTimezonesMock = [
  { city: "Dawson City", timezone: "America/Dawson", pop: 1000 },
  { city: "Honolulu", timezone: "Pacific/Honolulu", pop: 2000 },
  { city: "Juneau", timezone: "America/Juneau", pop: 3000 },
  { city: "Toronto", timezone: "America/Toronto", pop: 4000 },
];

vi.mock("@calcom/lib/timezone-cdn", () => ({
  fetchCityTimezonesFromCDN: vi.fn(),
}));

const formatOffset = (offset: string) =>
  offset.replace(/^([-+])(0)(\d):00$/, (_, sign, _zero, hour) => `${sign}${hour}:00`);
const formatTimeZoneWithOffset = (timeZone: string) =>
  `${timeZone} GMT ${formatOffset(dayjs.tz(undefined, timeZone).format("Z"))}`;

const timezoneMockValues = ["America/Dawson", "Pacific/Honolulu", "America/Juneau", "America/Toronto"];
const optionMockValues = timezoneMockValues.map(formatTimeZoneWithOffset);

const classNames = {
  singleValue: () => "test1",
  valueContainer: () => "test2",
  control: () => "test3",
  input: () => "test4",
  option: () => "test5",
  menuList: () => "test6",
  menu: () => "test7",
  multiValue: () => "test8",
};

const onChangeMock = vi.fn();

const renderSelect = (newProps: SelectProps & { variant?: "default" | "minimal" }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <form aria-label="test-form">
        <label htmlFor="test">Test</label>
        <TimezoneSelect {...newProps} inputId="test" />
      </form>
    </QueryClientProvider>
  );
};

const openMenu = async () => {
  await waitFor(async () => {
    const element = screen.getByLabelText("Test");
    element.focus();
    fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
    screen.getByText("Pacific/Honolulu GMT -10:00");
  });
};

describe("Test TimezoneSelect", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("Test TimezoneSelect with isPending = false", () => {
    beforeEach(async () => {
      const { fetchCityTimezonesFromCDN } = await import("@calcom/lib/timezone-cdn");
      vi.mocked(fetchCityTimezonesFromCDN).mockResolvedValue(cityTimezonesMock);
    });
    test("Should render with the correct CSS when provided with classNames prop", async () => {
      renderSelect({ value: timezoneMockValues[0], classNames });

      await waitFor(() => {
        expect(screen.queryByRole("combobox")).toBeEnabled();
      });

      await openMenu();

      const dawsonEl = screen.getByText("Pacific/Honolulu GMT -10:00");

      expect(dawsonEl).toBeInTheDocument();

      const singleValueEl = dawsonEl.parentElement;
      const valueContainerEl = singleValueEl?.parentElement;
      const controlEl = valueContainerEl?.parentElement;
      const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
      const optionEl = screen.getByText(optionMockValues[0]).parentElement?.parentElement;
      const menuListEl = optionEl?.parentElement;
      const menuEl = menuListEl?.parentElement;

      expect(singleValueEl).toHaveClass(classNames.singleValue());
      expect(valueContainerEl).toHaveClass(classNames.valueContainer());
      expect(controlEl).toHaveClass(classNames.control());
      expect(inputEl).toHaveClass(classNames.input());
      expect(optionEl).toHaveClass(classNames.option());
      expect(menuListEl).toHaveClass(classNames.menuList());
      expect(menuEl).toHaveClass(classNames.menu());

      for (const mockText of optionMockValues) {
        expect(screen.getByText(mockText)).toBeInTheDocument();
      }
    });

    test("Should render with the correct CSS when provided with className prop", async () => {
      renderSelect({ value: timezoneMockValues[0], className: "test-css" });

      await waitFor(() => {
        expect(screen.queryByRole("combobox")).toBeEnabled();
      });

      await openMenu();
      const labelTest = screen.getByText("Test");
      const timezoneEl = labelTest.nextSibling;
      expect(timezoneEl).toHaveClass("test-css");
    });

    test("Should render with the correct CSS when isMulti is enabled", async () => {
      renderSelect({ value: timezoneMockValues[0], isMulti: true, classNames });

      await waitFor(() => {
        expect(screen.queryByRole("combobox")).toBeEnabled();
      });

      await openMenu();

      const dawsonEl = screen.getByText("Pacific/Honolulu GMT -10:00");
      const multiValueEl = dawsonEl.parentElement?.parentElement;
      expect(multiValueEl).toHaveClass(classNames.multiValue());

      const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
      const menuIsOpenEl = inputEl?.parentElement?.nextSibling;
      expect(menuIsOpenEl).toHaveClass("[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform ");
    });

    test("Should render with the correct CSS when menu is open and onChange is called", async () => {
      renderSelect({ value: timezoneMockValues[0], onChange: onChangeMock });

      await waitFor(() => {
        expect(screen.queryByRole("combobox")).toBeEnabled();
      });

      await waitFor(async () => {
        const element = screen.getByLabelText("Test");
        element.focus();
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
        screen.getByText("America/Juneau GMT -8:00");

        const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
        const menuIsOpenEl = inputEl?.parentElement?.nextSibling;
        expect(menuIsOpenEl).toHaveClass("rotate-180 transition-transform ");
        const opt = screen.getByText("America/Juneau GMT -8:00");
        fireEvent.click(opt);
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
      });

      expect(onChangeMock).toBeCalled();
    });
  });

  describe("Test TimezoneSelect with isPending = true", () => {
    beforeEach(async () => {
      const { fetchCityTimezonesFromCDN } = await import("@calcom/lib/timezone-cdn");
      vi.mocked(fetchCityTimezonesFromCDN).mockImplementation(
        () =>
          new Promise(() => {
            return undefined;
          })
      );
    });

    test("Should have no options when isPending is true", async () => {
      renderSelect({ value: timezoneMockValues[0] });
      await waitFor(async () => {
        const element = screen.getByLabelText("Test");
        element.focus();
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
      });

      for (const mockText of optionMockValues) {
        const optionEl = screen.queryByText(mockText);
        expect(optionEl).toBeNull();
      }
    });
  });
});
