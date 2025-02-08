import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import dayjs from "@calcom/dayjs";

dayjs.extend(utc);
dayjs.extend(timezone);

const mockDayjs = vi.fn((date) => dayjs(date));

mockDayjs.utc = vi.fn((date) => dayjs.utc(date));
mockDayjs.tz = vi.fn();
mockDayjs.extend = vi.fn();

export default mockDayjs;
