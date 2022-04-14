import dayjs, { Dayjs } from "dayjs";
import { I18n } from "next-i18next";

import { detectBrowserTimeFormat } from "@lib/timeFormat";

import { parseZone } from "./parseZone";

export const parseDate = (date: string | null | Dayjs, i18n: I18n) => {
  if (!date) return "No date";
  const parsedZone = parseZone(date);
  if (!parsedZone?.isValid()) return "Invalid date";
  const formattedTime = parsedZone?.format(detectBrowserTimeFormat);
  return formattedTime + ", " + dayjs(date).toDate().toLocaleString(i18n.language, { dateStyle: "full" });
};
