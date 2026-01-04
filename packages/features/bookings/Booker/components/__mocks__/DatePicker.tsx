import { vi } from "vitest";

vi.mock("../components/DatePicker", () => ({
  DatePicker: () => <div data-testid="date-picker">Mock Date Picker</div>,
}));
