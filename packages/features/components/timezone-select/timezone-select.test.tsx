/* eslint-disable playwright/missing-playwright-await */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Props as SelectProps } from "react-timezone-select";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";

import { cityTimezonesHandler } from "../../cityTimezones/cityTimezonesHandler";
import { TimezoneSelect } from "./TimezoneSelect";

vi.mock("../../cityTimezones/cityTimezonesHandler", () => ({
  cityTimezonesHandler: vi.fn(),
}));

const mockCityTimezonesHandler = vi.mocked(cityTimezonesHandler);

const cityTimezonesMock = [
  { city: "Dawson City", timezone: "America/Dawson", population: 1375 },
  { city: "Honolulu", timezone: "Pacific/Honolulu", population: 345064 },
  { city: "Juneau", timezone: "America/Juneau", population: 32255 },
  { city: "Toronto", timezone: "America/Toronto", population: 2930000 },
];

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
  render(
    <form aria-label="test-form">
      <label htmlFor="test">Test</label>
      <TimezoneSelect {...newProps} inputId="test" />
    </form>
  );
};

const openMenu = async () => {
  await waitFor(
    () => {
      const element = screen.getByLabelText("Test");
      expect(element).toBeEnabled();
    },
    { timeout: 5000 }
  );

  await waitFor(async () => {
    const element = screen.getByLabelText("Test");
    element.focus();
    fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
    screen.getByText(optionMockValues[1]);
  });
};

describe("Test TimezoneSelect", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("Test TimezoneSelect with isPending = false", () => {
    beforeEach(() => {
      mockCityTimezonesHandler.mockClear();
      mockCityTimezonesHandler.mockResolvedValue(cityTimezonesMock);
    });
    test("Should render with the correct CSS when provided with classNames prop", async () => {
      renderSelect({ value: timezoneMockValues[0], classNames });
      await openMenu();

      const dawsonEl = screen.getByText("America/Dawson");

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
      await openMenu();
      const labelTest = screen.getByText("Test");
      const timezoneEl = labelTest.nextSibling;
      expect(timezoneEl).toHaveClass("test-css");
    });

    test("Should render with the correct CSS when isMulti is enabled", async () => {
      renderSelect({ value: timezoneMockValues[0], isMulti: true, classNames });
      await openMenu();

      const dawsonEl = screen.getByText("America/Dawson");
      const multiValueEl = dawsonEl.parentElement?.parentElement;
      expect(multiValueEl).toHaveClass(classNames.multiValue());

      const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
      const menuIsOpenEl = inputEl?.parentElement?.nextSibling;
      expect(menuIsOpenEl).toHaveClass("[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform ");
    });

    test("Should render with the correct CSS when menu is open and onChange is called", async () => {
      renderSelect({ value: timezoneMockValues[0], onChange: onChangeMock });
      await waitFor(async () => {
        const element = screen.getByLabelText("Test");
        element.focus();
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
        screen.getByText(optionMockValues[3]);

        const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
        const menuIsOpenEl = inputEl?.parentElement?.nextSibling;
        expect(menuIsOpenEl).toHaveClass("rotate-180 transition-transform ");
        const opt = screen.getByText(optionMockValues[3]);
        fireEvent.click(opt);
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
      });

      expect(onChangeMock).toBeCalled();
    });
  });

  describe("Test TimezoneSelect with isPending = true", () => {
    beforeEach(() => {
      mockCityTimezonesHandler.mockClear();
      mockCityTimezonesHandler.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves to simulate loading state
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
