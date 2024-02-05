/* eslint-disable @calcom/eslint/deprecated-imports */
import dayjsBusinessTime from "dayjs-business-days2";

import dayjs from "@calcom/dayjs-fork";
import customParseFormat from "@calcom/dayjs-fork/plugin/customParseFormat";
import duration from "@calcom/dayjs-fork/plugin/duration";
import isBetween from "@calcom/dayjs-fork/plugin/isBetween";
import isToday from "@calcom/dayjs-fork/plugin/isToday";
import localizedFormat from "@calcom/dayjs-fork/plugin/localizedFormat";
import minmax from "@calcom/dayjs-fork/plugin/minMax";
import relativeTime from "@calcom/dayjs-fork/plugin/relativeTime";
import timeZone from "@calcom/dayjs-fork/plugin/timezone";
import toArray from "@calcom/dayjs-fork/plugin/toArray";
import utc from "@calcom/dayjs-fork/plugin/utc";

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
