const createMockFn = () => {
  if (typeof jest !== "undefined" && jest.fn) {
    return jest.fn;
  }
  return (impl?: any) => impl || (() => {});
};

const mockFn = createMockFn();

const mockDayjsInstance = {
  format: mockFn(() => "2024-01-01T00:00:00Z"),
  toISOString: mockFn(() => "2024-01-01T00:00:00Z"),
  valueOf: mockFn(() => 1704067200000),
  toString: mockFn(() => "2024-01-01T00:00:00Z"),
  utc: mockFn(() => mockDayjsInstance),
  tz: mockFn(() => mockDayjsInstance),
  add: mockFn(() => mockDayjsInstance),
  subtract: mockFn(() => mockDayjsInstance),
  startOf: mockFn(() => mockDayjsInstance),
  endOf: mockFn(() => mockDayjsInstance),
  isBefore: mockFn(() => false),
  isAfter: mockFn(() => false),
  isSame: mockFn(() => false),
  isBetween: mockFn(() => false),
  isToday: mockFn(() => false),
  diff: mockFn(() => 0),
  clone: mockFn(() => mockDayjsInstance),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDayjs: any = Object.assign(
  mockFn(() => mockDayjsInstance),
  {
    utc: mockFn(() => mockDayjsInstance),
    tz: Object.assign(
      mockFn(() => mockDayjsInstance),
      {
        setDefault: mockFn(),
      }
    ),
    extend: mockFn(),
    locale: mockFn(),
    isDayjs: mockFn(() => true),
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dayjs = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConfigType = any;

export default mockDayjs;
