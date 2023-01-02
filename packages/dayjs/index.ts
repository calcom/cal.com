/* eslint-disable @calcom/eslint/deprecated-imports */
import dayjs from "dayjs";
import dayjsBusinessTime from "dayjs-business-days2";
import "dayjs/locale/ar";
import "dayjs/locale/bg";
import "dayjs/locale/cs";
import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/es-mx";
import "dayjs/locale/fr";
import "dayjs/locale/he";
import "dayjs/locale/hu";
import "dayjs/locale/it";
import "dayjs/locale/ja";
import "dayjs/locale/ko";
import "dayjs/locale/nl";
import "dayjs/locale/pl";
import "dayjs/locale/pt";
import "dayjs/locale/pt-br";
import "dayjs/locale/ro";
import "dayjs/locale/ru";
import "dayjs/locale/sr";
import "dayjs/locale/sv";
import "dayjs/locale/tr";
import "dayjs/locale/uk";
import "dayjs/locale/vi";
import "dayjs/locale/zh-cn";
import "dayjs/locale/zh-tw";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import localizedFormat from "dayjs/plugin/localizedFormat";
import minmax from "dayjs/plugin/minMax";
import relativeTime from "dayjs/plugin/relativeTime";
import timeZone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

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

export type Dayjs = dayjs.Dayjs;

export type { ConfigType } from "dayjs";

export default dayjs;
