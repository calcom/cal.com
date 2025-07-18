import {
  format,
  parseISO,
  addMinutes,
  addDays,
  addHours,
  addWeeks,
  addMonths,
  addYears,
  subMinutes,
  subDays,
  subHours,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfHour,
  endOfHour,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getHours,
  getMinutes,
  getSeconds,
  setHours,
  setMinutes,
  setSeconds,
  getDay,
  isBefore,
  isAfter,
  isValid,
  differenceInMinutes,
  differenceInDays,
  differenceInHours,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  max,
  min,
} from "date-fns";
import { toZonedTime, getTimezoneOffset } from "date-fns-tz";

import type { Dayjs as DayjsType } from "@calcom/dayjs";

export type Dayjs = DateFnsDayjs;

class DateFnsDayjs {
  private _date: Date;
  private _timezone: string | null;

  constructor(input?: any, _formatStr?: string, _locale?: string, _strict?: boolean) {
    if (input instanceof DateFnsDayjs) {
      this._date = new Date(input._date);
      this._timezone = input._timezone;
    } else if (input instanceof Date) {
      this._date = new Date(input);
      this._timezone = null;
    } else if (input === undefined || input === null) {
      this._date = new Date();
      this._timezone = null;
    } else if (typeof input === "string") {
      try {
        this._date = parseISO(input);
        this._timezone = null;
      } catch {
        this._date = new Date(input);
        this._timezone = null;
      }
    } else {
      this._date = new Date();
      this._timezone = null;
    }
  }

  static utc(input?: any, _formatStr?: string): DateFnsDayjs {
    if (input === undefined) {
      return new DateFnsDayjs(new Date());
    }

    let date: Date;
    if (typeof input === "string") {
      date = parseISO(input);
    } else {
      date = new Date(input);
    }

    const adapter = new DateFnsDayjs(date);
    adapter._timezone = "UTC";
    return adapter;
  }

  static tz(input: any, timezone?: string): DateFnsDayjs {
    let date: Date;
    if (typeof input === "string") {
      date = parseISO(input);
    } else {
      date = new Date(input);
    }

    const adapter = new DateFnsDayjs(date);
    adapter._timezone = timezone || null;
    return adapter;
  }

  static max(...dates: (DateFnsDayjs | Date | DayjsType)[]): DateFnsDayjs {
    const jsDates = dates.map((d) => {
      if (d instanceof DateFnsDayjs) return d._date;
      if (d instanceof Date) return d;
      return new Date(d.valueOf());
    });
    const maxDate = max(jsDates);
    return new DateFnsDayjs(maxDate);
  }

  static min(...dates: (DateFnsDayjs | Date | DayjsType)[]): DateFnsDayjs {
    const jsDates = dates.map((d) => {
      if (d instanceof DateFnsDayjs) return d._date;
      if (d instanceof Date) return d;
      return new Date(d.valueOf());
    });
    const minDate = min(jsDates);
    return new DateFnsDayjs(minDate);
  }

  format(formatStr = "yyyy-MM-dd HH:mm:ss"): string {
    const dateFnsFormat = formatStr
      .replace(/YYYY/g, "yyyy")
      .replace(/MM/g, "LL")
      .replace(/DD/g, "dd")
      .replace(/HH/g, "HH")
      .replace(/mm/g, "mm")
      .replace(/ss/g, "ss");

    const dateToFormat =
      this._timezone && this._timezone !== "UTC" ? toZonedTime(this._date, this._timezone) : this._date;

    return format(dateToFormat, dateFnsFormat);
  }

  toISOString(): string {
    return this._date.toISOString();
  }

  toDate(): Date {
    return new Date(this._date);
  }

  valueOf(): number {
    return this._date.valueOf();
  }

  utc(): any {
    const adapter = new DateFnsDayjs(this._date);
    adapter._timezone = "UTC";
    return adapter;
  }

  tz(timezone?: string): any {
    if (!timezone) return this;
    const adapter = new DateFnsDayjs(this._date);
    adapter._timezone = timezone;
    return adapter;
  }

  utcOffset(): any {
    if (this._timezone && this._timezone !== "UTC") {
      return -getTimezoneOffset(this._timezone, this._date) / (1000 * 60);
    }
    return -this._date.getTimezoneOffset();
  }

  add(amount: number, unit: string): any {
    let newDate: Date;
    switch (unit) {
      case "minute":
      case "minutes":
        newDate = addMinutes(this._date, amount);
        break;
      case "hour":
      case "hours":
        newDate = addHours(this._date, amount);
        break;
      case "day":
      case "days":
        newDate = addDays(this._date, amount);
        break;
      case "week":
      case "weeks":
        newDate = addWeeks(this._date, amount);
        break;
      case "month":
      case "months":
        newDate = addMonths(this._date, amount);
        break;
      case "year":
      case "years":
        newDate = addYears(this._date, amount);
        break;
      default:
        newDate = new Date(this._date);
    }

    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  subtract(amount: number, unit: string): any {
    let newDate: Date;
    switch (unit) {
      case "minute":
      case "minutes":
        newDate = subMinutes(this._date, amount);
        break;
      case "hour":
      case "hours":
        newDate = subHours(this._date, amount);
        break;
      case "day":
      case "days":
        newDate = subDays(this._date, amount);
        break;
      case "week":
      case "weeks":
        newDate = subWeeks(this._date, amount);
        break;
      case "month":
      case "months":
        newDate = subMonths(this._date, amount);
        break;
      case "year":
      case "years":
        newDate = subYears(this._date, amount);
        break;
      default:
        newDate = new Date(this._date);
    }

    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  startOf(unit: string): any {
    let newDate: Date;
    switch (unit) {
      case "day":
        newDate = startOfDay(this._date);
        break;
      case "hour":
        newDate = startOfHour(this._date);
        break;
      case "week":
        newDate = startOfWeek(this._date);
        break;
      case "month":
        newDate = startOfMonth(this._date);
        break;
      case "year":
        newDate = startOfYear(this._date);
        break;
      default:
        newDate = new Date(this._date);
    }

    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  endOf(unit: string): any {
    let newDate: Date;
    switch (unit) {
      case "day":
        newDate = endOfDay(this._date);
        break;
      case "hour":
        newDate = endOfHour(this._date);
        break;
      case "week":
        newDate = endOfWeek(this._date);
        break;
      case "month":
        newDate = endOfMonth(this._date);
        break;
      case "year":
        newDate = endOfYear(this._date);
        break;
      default:
        newDate = new Date(this._date);
    }

    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  hour(value?: number): any {
    if (value === undefined) {
      return getHours(this._date);
    }
    const newDate = setHours(this._date, value);
    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  minute(value?: number): any {
    if (value === undefined) {
      return getMinutes(this._date);
    }
    const newDate = setMinutes(this._date, value);
    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  second(value?: number): any {
    if (value === undefined) {
      return getSeconds(this._date);
    }
    const newDate = setSeconds(this._date, value);
    const adapter = new DateFnsDayjs(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  day(): number {
    return getDay(this._date);
  }

  isBefore(other: DateFnsDayjs | Date | string | DayjsType): boolean {
    let otherDate: Date;
    if (other instanceof DateFnsDayjs) {
      otherDate = other._date;
    } else if (other instanceof Date) {
      otherDate = other;
    } else if (typeof other === "string") {
      otherDate = new Date(other);
    } else {
      otherDate = new Date(other.valueOf());
    }
    return isBefore(this._date, otherDate);
  }

  isAfter(other: DateFnsDayjs | Date | string | DayjsType): boolean {
    let otherDate: Date;
    if (other instanceof DateFnsDayjs) {
      otherDate = other._date;
    } else if (other instanceof Date) {
      otherDate = other;
    } else if (typeof other === "string") {
      otherDate = new Date(other);
    } else {
      otherDate = new Date(other.valueOf());
    }
    return isAfter(this._date, otherDate);
  }

  isBetween(start: any, end: any, granularity?: string | null, inclusivity?: string): boolean {
    let startDate: Date;
    let endDate: Date;

    if (start instanceof DateFnsDayjs) {
      startDate = start._date;
    } else if (start instanceof Date) {
      startDate = start;
    } else {
      startDate = new Date(start);
    }

    if (end instanceof DateFnsDayjs) {
      endDate = end._date;
    } else if (end instanceof Date) {
      endDate = end;
    } else {
      endDate = new Date(end);
    }

    if (inclusivity === "[]") {
      return this._date >= startDate && this._date <= endDate;
    }
    return this._date > startDate && this._date < endDate;
  }

  isValid(): boolean {
    return isValid(this._date);
  }

  diff(other: DateFnsDayjs | Date | string | DayjsType, unit?: string): number {
    let otherDate: Date;
    if (other instanceof DateFnsDayjs) {
      otherDate = other._date;
    } else if (other instanceof Date) {
      otherDate = other;
    } else if (typeof other === "string") {
      otherDate = new Date(other);
    } else {
      otherDate = new Date(other.valueOf());
    }

    switch (unit) {
      case "minute":
      case "minutes":
        return differenceInMinutes(this._date, otherDate);
      case "hour":
      case "hours":
        return differenceInHours(this._date, otherDate);
      case "day":
      case "days":
        return differenceInDays(this._date, otherDate);
      case "week":
      case "weeks":
        return differenceInWeeks(this._date, otherDate);
      case "month":
      case "months":
        return differenceInMonths(this._date, otherDate);
      case "year":
      case "years":
        return differenceInYears(this._date, otherDate);
      default:
        return this._date.getTime() - otherDate.getTime();
    }
  }

  clone(): any {
    const adapter = new DateFnsDayjs(this._date);
    adapter._timezone = this._timezone;
    return adapter;
  }
}

function dateFnsDayjs(input?: any, formatStr?: string, locale?: string, strict?: boolean): DateFnsDayjs {
  return new DateFnsDayjs(input, formatStr, locale, strict);
}

dateFnsDayjs.utc = DateFnsDayjs.utc;
dateFnsDayjs.tz = DateFnsDayjs.tz;
dateFnsDayjs.max = DateFnsDayjs.max;
dateFnsDayjs.min = DateFnsDayjs.min;
dateFnsDayjs.extend = () => {
  return;
};

export default dateFnsDayjs;
