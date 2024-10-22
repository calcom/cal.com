import type { Dayjs, PluginFunc } from "dayjs";

declare const plugin: PluginFunc;
export as namespace plugin;
export = plugin;
declare namespace plugin {
  interface BusinessDaysPluginOptions {
    holidays?: string[];
    holidayFormat?: string;
    additionalWorkingDays?: string[];
    additionalWorkingDayFormat?: string;
    workingWeekdays?: number[];
  }

  interface BusinessDaysPlugin {
    isHoliday(): boolean;
    isBusinessDay(): boolean;
    isAdditionalWorkingDay(): boolean;
    businessDaysAdd(days: number): Dayjs;
    businessDaysSubtract(days: number): Dayjs;
    businessDiff(date: Dayjs): number;
    nextBusinessDay(): Dayjs;
    prevBusinessDay(): Dayjs;
    businessDaysInMonth(): Dayjs[];
    lastBusinessDayOfMonth(): Dayjs;
    businessWeeksInMonth(): Dayjs[][];
  }
}

declare module "dayjs" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface, no-shadow
  interface Dayjs extends plugin.BusinessDaysPlugin {}

  function getWorkingWeekdays(): number[];
  function setWorkingWeekdays(workingWeekdays: number[]): void;
  function getHolidays(): string[];
  function setHolidays(holidays: string[]): void;
  function getHolidayFormat(): string | undefined;
  function setHolidayFormat(holidayFormat: string): void;
  function getAdditionalWorkingDays(): string[];
  function setAdditionalWorkingDays(additionalWorkingDays: string[]): void;
  function getAdditionalWorkingDayFormat(): string | undefined;
  function setAdditionalWorkingDayFormat(additionalWorkingDayFormat: string): void;
}
