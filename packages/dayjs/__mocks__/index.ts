import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { vi } from "vitest";

import dayjs from "@calcom/dayjs";

dayjs.extend(utc);
dayjs.extend(timezone);

// biome-ignore lint/nursery/useExplicitType: mock function
const mockDayjs = vi.fn((date: Parameters<typeof dayjs>[0]) => dayjs(date));

mockDayjs.utc = vi.fn((date: Parameters<typeof dayjs.utc>[0]) => dayjs.utc(date));
mockDayjs.tz = vi.fn();
mockDayjs.extend = vi.fn();

export default mockDayjs;
