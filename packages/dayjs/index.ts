/* eslint-disable @calcom/eslint/deprecated-imports */
import dayjs from "dayjs";
import dayjsBusinessTime from "dayjs-business-days2";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import localizedFormat from "dayjs/plugin/localizedFormat";
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

require('dayjs/locale/ar');
require('dayjs/locale/bg');
require('dayjs/locale/cs');
require('dayjs/locale/de');
require('dayjs/locale/es');
require('dayjs/locale/es-mx');
require('dayjs/locale/fr');
require('dayjs/locale/he');
require('dayjs/locale/hu');
require('dayjs/locale/it');
require('dayjs/locale/ja');
require('dayjs/locale/ko');
require('dayjs/locale/nl');
require('dayjs/locale/pl');
require('dayjs/locale/pt');
require('dayjs/locale/pt-br');
require('dayjs/locale/ro');
require('dayjs/locale/ru');
require('dayjs/locale/sr');
require('dayjs/locale/sv');
require('dayjs/locale/tr');
require('dayjs/locale/uk');
require('dayjs/locale/vi');
require('dayjs/locale/zh-tw');
require('dayjs/locale/zh-cn');

export type Dayjs = dayjs.Dayjs;

export type { ConfigType } from "dayjs";

export default dayjs;
