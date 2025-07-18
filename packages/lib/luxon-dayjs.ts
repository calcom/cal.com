import { DateTime } from "luxon";

import type { Dayjs as DayjsType } from "@calcom/dayjs";

export type Dayjs = LuxonDayjs;

class LuxonDayjs {
  private _dt: DateTime;

  constructor(input?: any, _format?: string, _locale?: string, _strict?: boolean) {
    if (input instanceof LuxonDayjs) {
      this._dt = input._dt;
    } else if (input instanceof DateTime) {
      this._dt = input;
    } else if (input === undefined || input === null) {
      this._dt = DateTime.now();
    } else if (typeof input === "string") {
      if (_format) {
        this._dt = DateTime.fromFormat(input, _format);
      } else {
        this._dt = DateTime.fromISO(input);
      }
    } else if (input instanceof Date) {
      this._dt = DateTime.fromJSDate(input);
    } else {
      this._dt = DateTime.now();
    }
  }

  static utc(input?: any, _format?: string): LuxonDayjs {
    if (input === undefined) {
      return new LuxonDayjs(DateTime.utc());
    }
    if (typeof input === "string") {
      const dt = _format
        ? DateTime.fromFormat(input, _format, { zone: "utc" })
        : DateTime.fromISO(input, { zone: "utc" });
      return new LuxonDayjs(dt);
    }
    return new LuxonDayjs(DateTime.fromJSDate(input).toUTC());
  }

  static tz(input: any, timezone?: string): LuxonDayjs {
    if (!timezone) return new LuxonDayjs(input);
    if (typeof input === "string") {
      const dt = DateTime.fromISO(input, { zone: timezone });
      return new LuxonDayjs(dt);
    }
    return new LuxonDayjs(DateTime.fromJSDate(input).setZone(timezone));
  }

  static max(...dates: (LuxonDayjs | Date | DayjsType)[]): LuxonDayjs {
    const luxonDates = dates.map((d) => {
      if (d instanceof LuxonDayjs) return d._dt;
      if (d instanceof Date) return DateTime.fromJSDate(d);
      return DateTime.fromJSDate(new Date(d.valueOf()));
    });
    const maxDate = DateTime.max(...luxonDates);
    return new LuxonDayjs(maxDate);
  }

  static min(...dates: (LuxonDayjs | Date | DayjsType)[]): LuxonDayjs {
    const luxonDates = dates.map((d) => {
      if (d instanceof LuxonDayjs) return d._dt;
      if (d instanceof Date) return DateTime.fromJSDate(d);
      return DateTime.fromJSDate(new Date(d.valueOf()));
    });
    const minDate = DateTime.min(...luxonDates);
    return new LuxonDayjs(minDate);
  }

  format(formatStr = "YYYY-MM-DD HH:mm:ss"): string {
    const luxonFormat = formatStr
      .replace(/YYYY/g, "yyyy")
      .replace(/MM/g, "LL")
      .replace(/DD/g, "dd")
      .replace(/HH/g, "HH")
      .replace(/mm/g, "mm")
      .replace(/ss/g, "ss");

    return this._dt.toFormat(luxonFormat);
  }

  toISOString(): string {
    return this._dt.toISO() || "";
  }

  toDate(): Date {
    return this._dt.toJSDate();
  }

  valueOf(): number {
    return this._dt.valueOf();
  }

  utc(): any {
    return new LuxonDayjs(this._dt.toUTC());
  }

  tz(timezone?: string): any {
    if (!timezone) return this;
    return new LuxonDayjs(this._dt.setZone(timezone));
  }

  utcOffset(): any {
    return this._dt.offset;
  }

  add(amount: number, unit: string): any {
    const luxonUnit = unit === "minute" ? "minutes" : unit === "day" ? "days" : unit;
    return new LuxonDayjs(this._dt.plus({ [luxonUnit]: amount }));
  }

  subtract(amount: number, unit: string): any {
    const luxonUnit = unit === "minute" ? "minutes" : unit === "day" ? "days" : unit;
    return new LuxonDayjs(this._dt.minus({ [luxonUnit]: amount }));
  }

  startOf(unit: string): any {
    return new LuxonDayjs(this._dt.startOf(unit as any));
  }

  endOf(unit: string): any {
    return new LuxonDayjs(this._dt.endOf(unit as any));
  }

  hour(value?: number): any {
    if (value === undefined) return this._dt.hour;
    return new LuxonDayjs(this._dt.set({ hour: value }));
  }

  minute(value?: number): any {
    if (value === undefined) return this._dt.minute;
    return new LuxonDayjs(this._dt.set({ minute: value }));
  }

  clone(): any {
    return new LuxonDayjs(this._dt);
  }

  second(value?: number): any {
    if (value === undefined) return this._dt.second;
    return new LuxonDayjs(this._dt.set({ second: value }));
  }

  day(): number {
    return this._dt.weekday === 7 ? 0 : this._dt.weekday;
  }

  isBefore(other: LuxonDayjs | Date | string | DayjsType): boolean {
    let otherDt: DateTime;
    if (other instanceof LuxonDayjs) {
      otherDt = other._dt;
    } else if (typeof other === "string") {
      otherDt = DateTime.fromISO(other);
    } else if (other instanceof Date) {
      otherDt = DateTime.fromJSDate(other);
    } else {
      otherDt = DateTime.fromJSDate(new Date(other.valueOf()));
    }
    return this._dt < otherDt;
  }

  isAfter(other: LuxonDayjs | Date | string | DayjsType): boolean {
    let otherDt: DateTime;
    if (other instanceof LuxonDayjs) {
      otherDt = other._dt;
    } else if (typeof other === "string") {
      otherDt = DateTime.fromISO(other);
    } else if (other instanceof Date) {
      otherDt = DateTime.fromJSDate(other);
    } else {
      otherDt = DateTime.fromJSDate(new Date(other.valueOf()));
    }
    return this._dt > otherDt;
  }

  isBetween(start: any, end: any, granularity?: string, inclusivity?: string): boolean {
    const startDt = start instanceof LuxonDayjs ? start._dt : DateTime.fromJSDate(new Date(start));
    const endDt = end instanceof LuxonDayjs ? end._dt : DateTime.fromJSDate(new Date(end));

    if (inclusivity === "[]") {
      return this._dt >= startDt && this._dt <= endDt;
    }
    return this._dt > startDt && this._dt < endDt;
  }

  isValid(): boolean {
    return this._dt.isValid;
  }

  diff(other: LuxonDayjs | Date | string | DayjsType, unit?: string): number {
    let otherDt: DateTime;
    if (other instanceof LuxonDayjs) {
      otherDt = other._dt;
    } else if (typeof other === "string") {
      otherDt = DateTime.fromISO(other);
    } else if (other instanceof Date) {
      otherDt = DateTime.fromJSDate(other);
    } else {
      otherDt = DateTime.fromJSDate(new Date(other.valueOf()));
    }
    return this._dt.diff(otherDt, unit as any).as(unit as any);
  }
}

function luxonDayjs(input?: any, format?: string, locale?: string, strict?: boolean): LuxonDayjs {
  return new LuxonDayjs(input, format, locale, strict);
}

luxonDayjs.utc = LuxonDayjs.utc;
luxonDayjs.tz = LuxonDayjs.tz;
luxonDayjs.max = LuxonDayjs.max;
luxonDayjs.min = LuxonDayjs.min;
luxonDayjs.extend = () => {
  return;
};

export default luxonDayjs;
