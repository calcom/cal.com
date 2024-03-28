/* eslint-disable @calcom/eslint/deprecated-imports */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import localizedFormat from "dayjs/plugin/localizedFormat";
import minmax from "dayjs/plugin/minMax";
import relativeTime from "dayjs/plugin/relativeTime";
import timeZone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

import BusinessDaysPlugin from "./plugins/business-days-plugin";

dayjs.extend(customParseFormat);
dayjs.extend(BusinessDaysPlugin);
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
