/* eslint-disable @calcom/eslint/deprecated-imports */
import dayjs from "dayjs";
import dayjsBusinessTime from "dayjs-business-days2";
import customParseFormat from "dayjs/plugin/customParseFormat";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import localizedFormat from "dayjs/plugin/localizedFormat";
import minmax from "dayjs/plugin/minMax";
import relativeTime from "dayjs/plugin/relativeTime";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

// IMPORTANT: This is a custom implementation of the timezone plugin that incorporates
// the changes suggested in https://github.com/iamkun/dayjs/pull/2019. The PR was opened August
// 8, 2022 and has not been merged. Using the change from this PR improves perf by orders of magnitude.
import timeZone from "./plugins/timezone";

dayjs.extend(customParseFormat);
dayjs.extend(dayjsBusinessTime);
dayjs.extend(isBetween);
dayjs.extend(isToday);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timeZone);
dayjs.extend(toArray);
dayjs.extend(utc);
dayjs.extend(minmax);
dayjs.extend(duration);

export type Dayjs = dayjs.Dayjs;

export type { ConfigType } from "dayjs";

export default dayjs;
