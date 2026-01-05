import { vi } from "vitest";
vi.mock("../DatePicker", () => ({
  DatePicker: () => <div data-testid="date-picker">Mock Date Picker</div>,
}));
