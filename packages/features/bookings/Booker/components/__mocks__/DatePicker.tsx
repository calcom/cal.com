// First, let's add more component mocks at the top with the other mocks
vi.mock("../components/DatePicker", () => ({
  DatePicker: () => <div data-testid="date-picker">Mock Date Picker</div>,
}));
