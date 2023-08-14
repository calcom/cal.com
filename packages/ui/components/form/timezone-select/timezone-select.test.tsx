/* eslint-disable playwright/missing-playwright-await */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Props as SelectProps } from "react-timezone-select";
import { vi } from "vitest";

import { TimezoneSelect } from "./TimezoneSelect";

const mockCityTimezones = [
  { city: "City 1", timezone: "Timezone 1" },
  { city: "City 2", timezone: "Timezone 2" },
];

const runtimeMock = async (bool: boolean) => {
  const updatedTrcp = {
    viewer: {
      public: {
        cityTimezones: {
          useQuery() {
            return {
              data: mockCityTimezones,
              isLoading: bool,
            };
          },
        },
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockedLib = (await import("@calcom/trpc/react")) as any;
  mockedLib.trpc = updatedTrcp;
};

const mockOptText = [
  "America/Dawson GMT -7:00",
  "Pacific/Midway GMT -11:00",
  "Pacific/Honolulu GMT -10:00",
  "America/Juneau GMT -8:00",
];

const MockTimezText = ["America/Dawson", "Pacific/Midway", "Pacific/Honolulu", "America/Juneau"];

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
  await waitFor(async () => {
    const element = screen.getByLabelText("Test");
    element.focus();
    fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
    screen.getByText(mockOptText[0]);
  });
};

describe("Test TimezoneSelect", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("Test TimezoneSelect with isLoading = false in mock", () => {
    beforeAll(async () => {
      await runtimeMock(false);
    });
    test("Should render with the correct CSS when has classNames prop", async () => {
      renderSelect({ value: MockTimezText[0], classNames });
      openMenu();

      const dawsonEl = screen.getByText(MockTimezText[0]);

      expect(dawsonEl).toBeInTheDocument();

      const singleValueEl = dawsonEl.parentElement;
      const valueContainerEl = singleValueEl?.parentElement;
      const controlEl = valueContainerEl?.parentElement;
      const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
      const optionEl = screen.getByText(mockOptText[0]).parentElement?.parentElement;
      const menuListEl = optionEl?.parentElement;
      const menuEl = menuListEl?.parentElement;

      expect(singleValueEl).toHaveClass(classNames.singleValue());
      expect(valueContainerEl).toHaveClass(classNames.valueContainer());
      expect(controlEl).toHaveClass(classNames.control());
      expect(inputEl).toHaveClass(classNames.input());
      expect(optionEl).toHaveClass(classNames.option());
      expect(menuListEl).toHaveClass(classNames.menuList());
      expect(menuEl).toHaveClass(classNames.menu());

      for (const mockText of mockOptText) {
        expect(screen.getByText(mockText)).toBeInTheDocument();
      }
    });

    test("Should render with the correct CSS when has className prop", async () => {
      renderSelect({ value: MockTimezText[0], className: "test-css" });
      openMenu();
      const labelTest = screen.getByText("Test");
      const timezoneEl = labelTest.nextSibling;
      expect(timezoneEl).toHaveClass("test-css");
    });

    test("Should render with the correct CSS when has prop isMulti", async () => {
      renderSelect({ value: MockTimezText[0], isMulti: true, classNames });
      openMenu();

      const dawsonEl = screen.getByText(MockTimezText[0]);
      const multiValueEl = dawsonEl.parentElement?.parentElement;
      expect(multiValueEl).toHaveClass(classNames.multiValue());

      const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
      const menuIsOpenEl = inputEl?.parentElement?.nextSibling;
      expect(menuIsOpenEl).toHaveClass("[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform ");
    });

    test("Should render with the correct CSS when menu is open and onChange be called", async () => {
      renderSelect({ value: MockTimezText[0], onChange: onChangeMock });
      await waitFor(async () => {
        const element = screen.getByLabelText("Test");
        element.focus();
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
        screen.getByText(mockOptText[3]);

        const inputEl = screen.getByRole("combobox", { hidden: true }).parentElement;
        const menuIsOpenEl = inputEl?.parentElement?.nextSibling;
        expect(menuIsOpenEl).toHaveClass("rotate-180 transition-transform ");
        const opt = screen.getByText(mockOptText[3]);
        fireEvent.click(opt);
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
      });

      expect(onChangeMock).toBeCalled();
    });
  });

  describe("Test TimezoneSelect with isLoading = true in mock", () => {
    beforeAll(async () => {
      await runtimeMock(true);
    });
    test("Should have no options when isLoading is true", async () => {
      renderSelect({ value: MockTimezText[0] });
      await waitFor(async () => {
        const element = screen.getByLabelText("Test");
        element.focus();
        fireEvent.keyDown(element, { key: "ArrowDown", code: "ArrowDown" });
      });

      for (const mockText of mockOptText) {
        const optionEl = screen.queryByText(mockText);
        expect(optionEl).toBeNull();
      }
    });
  });
});
