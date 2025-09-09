import type { Dayjs, PluginFunc } from "dayjs";

interface BusinessDaysPluginOptions {
  holidays?: string[];
  holidayFormat?: string;
  additionalWorkingDays?: string[];
  additionalWorkingDayFormat?: string;
  workingWeekdays?: number[];
}

const BusinessDaysPlugin: PluginFunc<BusinessDaysPluginOptions> = (
  options = {},
  dayjsClass,
  dayjsFactory
) => {
  const defaultWorkingWeekdays = [1, 2, 3, 4, 5];

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.getWorkingWeekdays = function (): number[] {
    return options.workingWeekdays || defaultWorkingWeekdays;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.setWorkingWeekdays = function (workingWeekdays: number[]): void {
    options.workingWeekdays = workingWeekdays;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.getHolidays = function (): string[] {
    return options.holidays || [];
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.setHolidays = function (holidays: string[]): void {
    options.holidays = holidays;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.getHolidayFormat = function (): string | undefined {
    return options.holidayFormat;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.setHolidayFormat = function (holidayFormat: string): void {
    options.holidayFormat = holidayFormat;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.getAdditionalWorkingDays = function (): string[] {
    return options.additionalWorkingDays || [];
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.setAdditionalWorkingDays = function (additionalWorkingDays: string[]): void {
    options.additionalWorkingDays = additionalWorkingDays;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.getAdditionalWorkingDayFormat = function (): string | undefined {
    return options.additionalWorkingDayFormat;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsFactory.setAdditionalWorkingDayFormat = function (additionalWorkingDayFormat: string): void {
    options.additionalWorkingDayFormat = additionalWorkingDayFormat;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.isHoliday = function (this: Dayjs): boolean {
    if (!options.holidays) {
      return false;
    }
    if (options.holidays.includes(this.format(options.holidayFormat))) {
      return true;
    }

    return false;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.isBusinessDay = function (this: Dayjs): boolean {
    const workingWeekdays = options.workingWeekdays || defaultWorkingWeekdays;

    // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
    if (this.isHoliday()) {
      return false;
    }
    // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
    if (this.isAdditionalWorkingDay()) {
      return true;
    }
    if (workingWeekdays.includes(this.day())) {
      return true;
    }

    return false;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.isAdditionalWorkingDay = function (this: Dayjs): boolean {
    if (!options.additionalWorkingDays) {
      return false;
    }
    if (options.additionalWorkingDays.includes(this.format(options.additionalWorkingDayFormat))) {
      return true;
    }

    return false;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.businessDaysAdd = function (this: Dayjs, days: number): Dayjs {
    const numericDirection = days < 0 ? -1 : 1;
    let currentDay = this.clone();
    let daysRemaining = Math.abs(days);

    while (daysRemaining > 0) {
      currentDay = currentDay.add(numericDirection, `d`);

      // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
      if (currentDay.isBusinessDay()) {
        daysRemaining -= 1;
      }
    }

    return currentDay;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.businessDaysSubtract = function (this: Dayjs, days: number): Dayjs {
    let currentDay = this.clone();

    // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
    currentDay = currentDay.businessDaysAdd(days * -1);

    return currentDay;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.businessDiff = function (this: Dayjs, date: Dayjs): number {
    const day1 = this.clone();
    const day2 = date.clone();

    const isPositiveDiff = day1 >= day2;
    let start = isPositiveDiff ? day2 : day1;
    const end = isPositiveDiff ? day1 : day2;

    let daysBetween = 0;

    if (start.isSame(end)) {
      return daysBetween;
    }

    while (start < end) {
      // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
      if (start.isBusinessDay()) {
        daysBetween += 1;
      }

      start = start.add(1, `d`);
    }

    return isPositiveDiff ? daysBetween : -daysBetween;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.nextBusinessDay = function (this: Dayjs): Dayjs {
    const searchLimit = 7;
    let currentDay = this.clone();

    let loopIndex = 1;
    while (loopIndex < searchLimit) {
      currentDay = currentDay.add(1, `day`);

      // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
      if (currentDay.isBusinessDay()) {
        break;
      }
      loopIndex += 1;
    }

    return currentDay;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.prevBusinessDay = function (this: Dayjs): Dayjs {
    const searchLimit = 7;
    let currentDay = this.clone();

    let loopIndex = 1;
    while (loopIndex < searchLimit) {
      currentDay = currentDay.subtract(1, `day`);

      // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
      if (currentDay.isBusinessDay()) {
        break;
      }
      loopIndex += 1;
    }

    return currentDay;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.businessDaysInMonth = function (this: Dayjs): Dayjs[] {
    if (!this.isValid()) {
      return [];
    }

    let currentDay = this.clone().startOf(`month`);
    const monthEnd = this.clone().endOf(`month`);
    const businessDays: Dayjs[] = [];
    let monthComplete = false;

    while (!monthComplete) {
      // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
      if (currentDay.isBusinessDay()) {
        businessDays.push(currentDay.clone());
      }

      currentDay = currentDay.add(1, `day`);

      if (currentDay.isAfter(monthEnd)) {
        monthComplete = true;
      }
    }

    return businessDays;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.lastBusinessDayOfMonth = function (this: Dayjs): Dayjs {
    // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
    const businessDays = this.businessDaysInMonth();
    const lastBusinessDay = businessDays[businessDays.length - 1];
    return lastBusinessDay;
  };

  // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
  dayjsClass.prototype.businessWeeksInMonth = function (this: Dayjs): Dayjs[][] {
    if (!this.isValid()) {
      return [];
    }

    let currentDay = this.clone().startOf(`month`);
    const monthEnd = this.clone().endOf(`month`);
    const businessWeeks: Dayjs[][] = [];
    let businessDays: Dayjs[] = [];
    let monthComplete = false;

    while (!monthComplete) {
      // @ts-expect-error - TODO: add proper TypeScript module augmentation for Dayjs plugin
      if (currentDay.isBusinessDay()) {
        businessDays.push(currentDay.clone());
      }

      if (currentDay.day() === 5 || currentDay.isSame(monthEnd, `day`)) {
        businessWeeks.push(businessDays);
        businessDays = [];
      }

      currentDay = currentDay.add(1, `day`);

      if (currentDay.isAfter(monthEnd)) {
        monthComplete = true;
      }
    }

    return businessWeeks;
  };
};

export default BusinessDaysPlugin;
