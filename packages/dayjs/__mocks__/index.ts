import dayjs from "@calcom/dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { vi } from "vitest";

dayjs.extend(utc);
dayjs.extend(timezone);

// biome-ignore lint/nursery/useExplicitType: mock function
const mockDayjs = Object.assign(
  vi.fn((date: Parameters<typeof dayjs>[0]) => dayjs(date)),
  {
    utc: vi.fn((date: Parameters<typeof dayjs.utc>[0]) => dayjs.utc(date)),
    tz: vi.fn(),
    extend: vi.fn(),
  }
);

export default mockDayjs;
