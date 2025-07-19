jest.mock("@calcom/dayjs", () => {
  const mockDayjsInstance = {
    format: jest.fn(() => "2024-01-01T00:00:00Z"),
    toISOString: jest.fn(() => "2024-01-01T00:00:00Z"),
    valueOf: jest.fn(() => 1704067200000),
    toString: jest.fn(() => "2024-01-01T00:00:00Z"),
    utc: jest.fn(function () {
      return this;
    }),
    tz: jest.fn(function () {
      return this;
    }),
    add: jest.fn(function () {
      return this;
    }),
    subtract: jest.fn(function () {
      return this;
    }),
    startOf: jest.fn(function () {
      return this;
    }),
    endOf: jest.fn(function () {
      return this;
    }),
    isBefore: jest.fn(() => false),
    isAfter: jest.fn(() => false),
    isSame: jest.fn(() => false),
    isBetween: jest.fn(() => false),
    isToday: jest.fn(() => false),
    diff: jest.fn(() => 0),
    clone: jest.fn(function () {
      return this;
    }),
  };

  const mockDayjs = Object.assign(
    jest.fn(() => mockDayjsInstance),
    {
      utc: jest.fn(() => mockDayjsInstance),
      tz: Object.assign(
        jest.fn(() => mockDayjsInstance),
        {
          setDefault: jest.fn(),
        }
      ),
      extend: jest.fn(),
      locale: jest.fn(),
      isDayjs: jest.fn(() => true),
    }
  );

  return {
    __esModule: true,
    default: mockDayjs,
  };
});
