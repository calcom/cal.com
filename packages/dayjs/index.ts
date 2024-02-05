/* eslint-disable @calcom/eslint/deprecated-imports */
import dayjsBusinessTime from "dayjs-business-days2";

import dayjs from "@calcom/dayjs";
import customParseFormat from "@calcom/dayjs/plugin/customParseFormat";
import duration from "@calcom/dayjs/plugin/duration";
import isBetween from "@calcom/dayjs/plugin/isBetween";
import isToday from "@calcom/dayjs/plugin/isToday";
import localizedFormat from "@calcom/dayjs/plugin/localizedFormat";
import minmax from "@calcom/dayjs/plugin/minMax";
import relativeTime from "@calcom/dayjs/plugin/relativeTime";
import timeZone from "@calcom/dayjs/plugin/timezone";
import toArray from "@calcom/dayjs/plugin/toArray";
import utc from "@calcom/dayjs/plugin/utc";

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
