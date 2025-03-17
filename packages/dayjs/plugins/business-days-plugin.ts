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

  (dayjsFactory as any).getWorkingWeekdays = function (): number[] {
    return options.workingWeekdays || defaultWorkingWeekdays;
  };

  (dayjsFactory as any).setWorkingWeekdays = function (workingWeekdays: number[]): void {
    options.workingWeekdays = workingWeekdays;
  };

  (dayjsFactory as any).getHolidays = function (): string[] {
    return options.holidays || [];
  };

  (dayjsFactory as any).setHolidays = function (holidays: string[]): void {
    options.holidays = holidays;
  };

  (dayjsFactory as any).getHolidayFormat = function (): string | undefined {
    return options.holidayFormat;
  };

  (dayjsFactory as any).setHolidayFormat = function (holidayFormat: string): void {
    options.holidayFormat = holidayFormat;
  };

  (dayjsFactory as any).getAdditionalWorkingDays = function (): string[] {
    return options.additionalWorkingDays || [];
  };

  (dayjsFactory as any).setAdditionalWorkingDays = function (additionalWorkingDays: string[]): void {
    options.additionalWorkingDays = additionalWorkingDays;
  };

  (dayjsFactory as any).getAdditionalWorkingDayFormat = function (): string | undefined {
    return options.additionalWorkingDayFormat;
  };

  (dayjsFactory as any).setAdditionalWorkingDayFormat = function (additionalWorkingDayFormat: string): void {
    options.additionalWorkingDayFormat = additionalWorkingDayFormat;
  };

  (dayjsClass.prototype as any).isHoliday = function (this: Dayjs): boolean {
    if (!options.holidays) {
      return false;
    }
    if (options.holidays.includes(this.format(options.holidayFormat))) {
      return true;
    }

    return false;
  };

  (dayjsClass.prototype as any).isBusinessDay = function (this: Dayjs): boolean {
    const workingWeekdays = options.workingWeekdays || defaultWorkingWeekdays;

    if ((this as any).isHoliday()) {
      return false;
    }
    if ((this as any).isAdditionalWorkingDay()) {
      return true;
    }
    if (workingWeekdays.includes(this.day())) {
      return true;
    }

    return false;
  };

  (dayjsClass.prototype as any).isAdditionalWorkingDay = function (this: Dayjs): boolean {
    if (!options.additionalWorkingDays) {
      return false;
    }
    if (options.additionalWorkingDays.includes(this.format(options.additionalWorkingDayFormat))) {
      return true;
    }

    return false;
  };

  (dayjsClass.prototype as any).businessDaysAdd = function (this: Dayjs, days: number): Dayjs {
    const numericDirection = days < 0 ? -1 : 1;
    let currentDay = this.clone();
    let daysRemaining = Math.abs(days);

    while (daysRemaining > 0) {
      currentDay = currentDay.add(numericDirection, `d`);

      if ((currentDay as any).isBusinessDay()) {
        daysRemaining -= 1;
      }
    }

    return currentDay;
  };

  (dayjsClass.prototype as any).businessDaysSubtract = function (this: Dayjs, days: number): Dayjs {
    let currentDay = this.clone();

    currentDay = (currentDay as any).businessDaysAdd(days * -1);

    return currentDay;
  };

  (dayjsClass.prototype as any).businessDiff = function (this: Dayjs, date: Dayjs): number {
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
      if ((start as any).isBusinessDay()) {
        daysBetween += 1;
      }

      start = start.add(1, `d`);
    }

    return isPositiveDiff ? daysBetween : -daysBetween;
  };

  (dayjsClass.prototype as any).nextBusinessDay = function (this: Dayjs): Dayjs {
    const searchLimit = 7;
    let currentDay = this.clone();

    let loopIndex = 1;
    while (loopIndex < searchLimit) {
      currentDay = currentDay.add(1, `day`);

      if ((currentDay as any).isBusinessDay()) {
        break;
      }
      loopIndex += 1;
    }

    return currentDay;
  };

  (dayjsClass.prototype as any).prevBusinessDay = function (this: Dayjs): Dayjs {
    const searchLimit = 7;
    let currentDay = this.clone();

    let loopIndex = 1;
    while (loopIndex < searchLimit) {
      currentDay = currentDay.subtract(1, `day`);

      if ((currentDay as any).isBusinessDay()) {
        break;
      }
      loopIndex += 1;
    }

    return currentDay;
  };

  (dayjsClass.prototype as any).businessDaysInMonth = function (this: Dayjs): Dayjs[] {
    if (!this.isValid()) {
      return [];
    }

    let currentDay = this.clone().startOf(`month`);
    const monthEnd = this.clone().endOf(`month`);
    const businessDays: Dayjs[] = [];
    let monthComplete = false;

    while (!monthComplete) {
      if ((currentDay as any).isBusinessDay()) {
        businessDays.push(currentDay.clone());
      }

      currentDay = currentDay.add(1, `day`);

      if (currentDay.isAfter(monthEnd)) {
        monthComplete = true;
      }
    }

    return businessDays;
  };

  (dayjsClass.prototype as any).lastBusinessDayOfMonth = function (this: Dayjs): Dayjs {
    const businessDays = (this as any).businessDaysInMonth();
    const lastBusinessDay = businessDays[businessDays.length - 1];
    return lastBusinessDay;
  };

  (dayjsClass.prototype as any).businessWeeksInMonth = function (this: Dayjs): Dayjs[][] {
    if (!this.isValid()) {
      return [];
    }

    let currentDay = this.clone().startOf(`month`);
    const monthEnd = this.clone().endOf(`month`);
    const businessWeeks: Dayjs[][] = [];
    let businessDays: Dayjs[] = [];
    let monthComplete = false;

    while (!monthComplete) {
      if ((currentDay as any).isBusinessDay()) {
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
