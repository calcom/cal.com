import "dayjs";

declare module "dayjs" {
  interface Dayjs {
    lastBusinessDayOfMonth(): Dayjs;
    businessDaysInMonth(): Dayjs[];
    businessWeeksInMonth(): Dayjs[][];
    isHoliday(): boolean;
    isBusinessDay(): boolean;
    isAdditionalWorkingDay(): boolean;
    businessDaysAdd(days: number): Dayjs;
    businessDaysSubtract(days: number): Dayjs;
    businessDiff(date: Dayjs): number;
    nextBusinessDay(): Dayjs;
    prevBusinessDay(): Dayjs;
  }

  export function getWorkingWeekdays(): number[];
  export function setWorkingWeekdays(workingWeekdays: number[]): void;
  export function getHolidays(): string[];
  export function setHolidays(holidays: string[]): void;
  export function getHolidayFormat(): string | undefined;
  export function setHolidayFormat(holidayFormat: string): void;
  export function getAdditionalWorkingDays(): string[];
  export function setAdditionalWorkingDays(additionalWorkingDays: string[]): void;
  export function getAdditionalWorkingDayFormat(): string | undefined;
  export function setAdditionalWorkingDayFormat(additionalWorkingDayFormat: string): void;
}
