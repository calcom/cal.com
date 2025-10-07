import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import widgets from "./widgets";

const { SelectWidget, MultiSelectWidget, NumberWidget } = widgets;

// Mock the dynamic import of Select component
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    return function MockSelect({
      options,
      onChange,
      value,
      isMulti,
    }: {
      options: { value: string; label: string }[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange: (value: any) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any;
      isMulti: boolean;
    }) {
      return (
        <select
          data-testid="mock-select"
          multiple={isMulti}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value={isMulti ? value.map((v: any) => v.value) : value?.value}
          onChange={(e) => {
            const selectedOptions = Array.from(e.target.selectedOptions, (option) => ({
              value: option.value,
              label: option.text,
            }));
            onChange(isMulti ? selectedOptions : selectedOptions[0]);
          }}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    };
  },
}));

describe("Select Widgets", () => {
  describe("SelectWidget", () => {
    const listValues = [
      { title: "Option 1", value: "1" },
      { title: "Option 2", value: "2" },
      { title: "Option 3", value: "3" },
    ];

    it("should handle render the value in option correctly", () => {
      const setValue = vi.fn();
      render(<SelectWidget value="2" setValue={setValue} listValues={listValues} />);

      const select = screen.getByTestId("mock-select");
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(setValue).not.toHaveBeenCalled();
    });

    it("should handle a value that is not in the list and reset the value to empty string", () => {
      const setValue = vi.fn();
      render(<SelectWidget value="4" setValue={setValue} listValues={listValues} />);

      const select = screen.getByTestId("mock-select");
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(setValue).toHaveBeenCalledWith("");
    });
  });

  describe("MultiSelectWidget", () => {
    const listValues = [
      { title: "Option 1", value: "1" },
      { title: "Option 2", value: "2" },
      { title: "Option 3", value: "3" },
    ];

    it("renders options correctly", () => {
      const setValue = vi.fn();

      render(<MultiSelectWidget value={[]} setValue={setValue} listValues={listValues} />);

      const select = screen.getByTestId("mock-select");
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(3);
      expect(setValue).not.toHaveBeenCalled();
    });

    it("sets value to empty array when no options match", () => {
      const setValue = vi.fn();
      render(<MultiSelectWidget value={["4", "5"]} setValue={setValue} listValues={listValues} />);

      expect(setValue).toHaveBeenCalledWith([]);
    });
  });
});

describe("NumberWidget", () => {
  const originalNavigatorLanguage = navigator.language;

  // fn to set navigator language dynamically for testing
  function setNavigatorLanguage(lang: string) {
    Object.defineProperty(window.navigator, "language", {
      value: lang,
      configurable: true,
    });
  }

  // reset to original navigator lanaguage after each test
  afterEach(() => {
    setNavigatorLanguage(originalNavigatorLanguage);
  });

  it("formats value using en-US locale", () => {
    setNavigatorLanguage("en-US");
    const setValue = vi.fn();

    render(<NumberWidget value="1234.56" setValue={setValue} />);

    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("1,234.56");
  });

  it("formats value using de-DE locale", () => {
    setNavigatorLanguage("de-DE");
    const setValue = vi.fn();

    render(<NumberWidget value="1234.56" setValue={setValue} />);

    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("1.234,56");
  });

  it("converts de-DE input to standard numeric value while keeping display localized", () => {
    setNavigatorLanguage("de-DE");
    const setValue = vi.fn();

    render(<NumberWidget value="" setValue={setValue} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "1.234,56" } });

    // Internal value sent to parent is normalized (standard numeric format)
    expect(setValue).toHaveBeenLastCalledWith("1234.56");

    // Display remains localized
    expect((input as HTMLInputElement).value).toBe("1.234,56");
  });

  it("converts negative de-DE input to standard numeric value", () => {
    setNavigatorLanguage("de-DE");
    const setValue = vi.fn();

    render(<NumberWidget value="" setValue={setValue} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "-1.234,56" } });

    expect(setValue).toHaveBeenLastCalledWith("-1234.56");
    expect((input as HTMLInputElement).value).toBe("-1.234,56");
  });

  it("converts en-US input with commas to standard numeric value", () => {
    setNavigatorLanguage("en-US");
    const setValue = vi.fn();

    render(<NumberWidget value="" setValue={setValue} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "1,234.56" } });

    expect(setValue).toHaveBeenLastCalledWith("1234.56");
    expect((input as HTMLInputElement).value).toBe("1,234.56");
  });

  it("keeps only the first decimal separator (de-DE)", () => {
    setNavigatorLanguage("de-DE");
    const setValue = vi.fn();

    render(<NumberWidget value="" setValue={setValue} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "1.234,56,78" } });

    // The widget removes subsequent decimal separators; normalized should have one dot
    expect(setValue).toHaveBeenLastCalledWith("1234.5678");
  });

  it("removes minus signs that aren't at the start", () => {
    setNavigatorLanguage("en-US");
    const setValue = vi.fn();

    render(<NumberWidget value="" setValue={setValue} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "12-34.5" } });

    // Only a leading minus is allowed; internal ones are removed
    expect(setValue).toHaveBeenLastCalledWith("1234.5");
  });

  it("keeps trailing decimal point in en-US", () => {
    setNavigatorLanguage("en-US");
    const setValue = vi.fn();

    render(<NumberWidget value="1234." setValue={setValue} />);

    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("1,234.");
  });

  it("allows typing just a minus sign", () => {
    setNavigatorLanguage("en-US");
    const setValue = vi.fn();

    render(<NumberWidget value="" setValue={setValue} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "-" } });

    expect(setValue).toHaveBeenLastCalledWith("-");
    // Should display the minus sign as typed
    expect((input as HTMLInputElement).value).toBe("-");
  });

  describe("Top locales display and normalization", () => {
    type LocaleCase = {
      locale: string;
      decimal: string;
      group?: string;
      groupSafeForTyping?: boolean;
    };

    const locales: LocaleCase[] = [
      { locale: "en-US", decimal: ".", group: ",", groupSafeForTyping: true },
      { locale: "es-ES", decimal: ",", group: ".", groupSafeForTyping: true },
      { locale: "de-DE", decimal: ",", group: ".", groupSafeForTyping: true },
      { locale: "ja-JP", decimal: ".", group: ",", groupSafeForTyping: true },
      { locale: "fr-FR", decimal: "," },
      { locale: "pt-BR", decimal: ",", group: ".", groupSafeForTyping: true },
      { locale: "ru-RU", decimal: "," },
      { locale: "it-IT", decimal: ",", group: ".", groupSafeForTyping: true },
      { locale: "nl-NL", decimal: ",", group: ".", groupSafeForTyping: true },
      { locale: "pl-PL", decimal: "," },
      { locale: "zh-CN", decimal: ".", group: ",", groupSafeForTyping: true },
      { locale: "ar-SA", decimal: ".", group: ",", groupSafeForTyping: true },
      { locale: "hi-IN", decimal: ".", group: ",", groupSafeForTyping: true },
      { locale: "ko-KR", decimal: ".", group: ",", groupSafeForTyping: true },
      { locale: "tr-TR", decimal: ",", group: ".", groupSafeForTyping: true },
    ];

    locales.forEach(({ locale, decimal, group, groupSafeForTyping }) => {
      it(`${locale}: displays value with correct formatting`, () => {
        setNavigatorLanguage(locale);
        const setValue = vi.fn();

        render(<NumberWidget value="1234.56" setValue={setValue} />);

        const input = screen.getByRole("textbox");
        const expected = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 14,
        }).format(1234.56);
        expect((input as HTMLInputElement).value).toBe(expected);
      });

      it(`${locale}: converts input with decimal to standard format`, () => {
        setNavigatorLanguage(locale);
        const setValue = vi.fn();

        render(<NumberWidget value="" setValue={setValue} />);
        const input = screen.getByRole("textbox");

        const localized = `1234${decimal}56`;
        fireEvent.change(input, { target: { value: localized } });

        expect(setValue).toHaveBeenLastCalledWith("1234.56");
      });

      if (group && groupSafeForTyping) {
        it(`${locale}: converts input with grouping and decimal to standard format`, () => {
          setNavigatorLanguage(locale);
          const setValue = vi.fn();

          render(<NumberWidget value="" setValue={setValue} />);
          const input = screen.getByRole("textbox");

          const localized = `1${group}234${decimal}56`;
          fireEvent.change(input, { target: { value: localized } });

          expect(setValue).toHaveBeenLastCalledWith("1234.56");
        });
      }
    });
  });

  describe("Number length handling", () => {
    it("handles 5 digits with 4 decimals (en-US)", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "12345.6789" } });

      expect(setValue).toHaveBeenLastCalledWith("12345.6789");
      expect((input as HTMLInputElement).value).toBe("12,345.6789");
    });

    it("handles 5 digits with 4 decimals (de-DE)", () => {
      setNavigatorLanguage("de-DE");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "12.345,6789" } });

      expect(setValue).toHaveBeenLastCalledWith("12345.6789");
      expect((input as HTMLInputElement).value).toBe("12.345,6789");
    });

    it("handles 10 digits with 2 decimals (en-US)", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "1234567890.12" } });

      expect(setValue).toHaveBeenLastCalledWith("1234567890.12");
      expect((input as HTMLInputElement).value).toBe("1,234,567,890.12");
    });

    it("handles 10 digits with 3 decimals (de-DE)", () => {
      setNavigatorLanguage("de-DE");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "1.234.567.890,123" } });

      expect(setValue).toHaveBeenLastCalledWith("1234567890.123");
      expect((input as HTMLInputElement).value).toBe("1.234.567.890,123");
    });

    it("handles exactly 15 digits without decimals (en-US)", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "123456789012345" } });

      expect(setValue).toHaveBeenLastCalledWith("123456789012345");
      expect((input as HTMLInputElement).value).toBe("123,456,789,012,345");
    });

    it("handles exactly 15 digits without decimals (de-DE)", () => {
      setNavigatorLanguage("de-DE");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "123.456.789.012.345" } });

      expect(setValue).toHaveBeenLastCalledWith("123456789012345");
      expect((input as HTMLInputElement).value).toBe("123.456.789.012.345");
    });

    it("does NOT test 15 digits WITH decimals (precision issues)", () => {
      // Intentionally skipped - would have precision issues with Number()
      // This comment documents why we don't test this case
    });
  });

  describe("15 significant digit limit", () => {
    it("accepts up to 15 integer digits", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "123456789012345" } });
      expect(setValue).toHaveBeenLastCalledWith("123456789012345");
    });

    it("cuts off 16+ digits to first 15 when provided via props", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="1234567890123456" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      // Should display truncated to 15 digits
      expect((input as HTMLInputElement).value).toBe("123,456,789,012,345");
    });

    it("cuts off 18 digits to first 15 when provided via props", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="123456789012345678" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      // Should display truncated to 15 digits
      expect((input as HTMLInputElement).value).toBe("123,456,789,012,345");
    });
  });

  describe("Edge cases", () => {
    it("handles zero", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="0" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      expect((input as HTMLInputElement).value).toBe("0");
    });

    it("handles zero with decimals", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="0.00" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      expect((input as HTMLInputElement).value).toBe("0");
    });

    it("removes leading zeros before decimal", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "000123.45" } });

      expect(setValue).toHaveBeenLastCalledWith("123.45");
    });

    it("updates when parent resets value to empty", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      const { rerender } = render(<NumberWidget value="1234.56" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("1,234.56");

      // Parent resets value
      rerender(<NumberWidget value="" setValue={setValue} />);

      expect((input as HTMLInputElement).value).toBe("");
    });

    it("updates when parent changes value from outside", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      const { rerender } = render(<NumberWidget value="100" setValue={setValue} />);

      let input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("100");

      // Parent changes value to different number
      rerender(<NumberWidget value="9999.99" setValue={setValue} />);

      input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("9,999.99");
    });

    it("updates when parent changes value from number to zero", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      const { rerender } = render(<NumberWidget value="1234" setValue={setValue} />);

      let input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("1,234");

      // Parent changes value to zero
      rerender(<NumberWidget value="0" setValue={setValue} />);

      input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("0");
    });

    it("handles negative zero", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="-0" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("0");
    });

    it("formats negative numbers correctly", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="-1234.56" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("-1,234.56");
    });

    it("handles very small decimal numbers", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="0.0001" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("0.0001");
    });

    it("handles numbers with many decimal places", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="123.123456789012" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("123.123456789012");
    });
  });

  describe("User input behavior", () => {
    it("allows typing decimal separator at end", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "123." } });

      expect(setValue).toHaveBeenLastCalledWith("123.");
      expect((input as HTMLInputElement).value).toBe("123.");
    });

    it("formats after typing complete decimal number", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);

      const input = screen.getByRole("textbox");

      // Type "123."
      fireEvent.change(input, { target: { value: "123." } });
      expect((input as HTMLInputElement).value).toBe("123.");

      // Complete with "5"
      fireEvent.change(input, { target: { value: "123.5" } });
      expect((input as HTMLInputElement).value).toBe("123.5");
    });

    it("removes letters and special characters", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "12abc34.56xyz" } });

      expect(setValue).toHaveBeenLastCalledWith("1234.56");
    });

    it("allows only one minus sign at the beginning", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      render(<NumberWidget value="" setValue={setValue} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "--123.45" } });

      expect(setValue).toHaveBeenLastCalledWith("-123.45");
    });
  });

  describe("Locale switching behavior", () => {
    it("updates display when locale changes from en-US to de-DE", () => {
      setNavigatorLanguage("en-US");
      const setValue = vi.fn();
      const { rerender } = render(<NumberWidget value="1234.56" setValue={setValue} />);

      let input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("1,234.56");

      // Switch locale
      setNavigatorLanguage("de-DE");
      rerender(<NumberWidget value="1234.56" setValue={setValue} />);

      input = screen.getByRole("textbox");
      expect((input as HTMLInputElement).value).toBe("1.234,56");
    });
  });
});
