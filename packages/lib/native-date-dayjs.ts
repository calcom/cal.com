import type { Dayjs as DayjsType } from "@calcom/dayjs";

export type Dayjs = NativeDateDayjs;

class NativeDateDayjs {
  private _date: Date;
  private _timezone: string | null;
  public $x: { $timezone?: string } = {};

  constructor(input?: any, _formatStr?: string, _locale?: string, _strict?: boolean) {
    if (input instanceof NativeDateDayjs) {
      this._date = new Date(input._date);
      this._timezone = input._timezone;
      this.$x = { $timezone: input._timezone || undefined };
    } else if (input instanceof Date) {
      this._date = new Date(input);
      this._timezone = null;
      this.$x = {};
    } else if (input === undefined || input === null) {
      this._date = new Date();
      this._timezone = null;
      this.$x = {};
    } else if (typeof input === "string") {
      this._date = new Date(input);
      this._timezone = null;
      this.$x = {};
    } else if (typeof input === "number") {
      this._date = new Date(input);
      this._timezone = null;
      this.$x = {};
    } else if (input && typeof input.toDate === "function") {
      this._date = new Date(input.toDate());
      this._timezone = null;
      this.$x = {};
    } else if (input && typeof input.valueOf === "function") {
      this._date = new Date(input.valueOf());
      this._timezone = null;
      this.$x = {};
    } else {
      this._date = new Date(input);
      this._timezone = null;
      this.$x = {};
    }

    if (!(this._date instanceof Date) || isNaN(this._date.getTime())) {
      this._date = new Date(NaN); // Create an invalid date
    }
  }

  static utc(input?: any, _formatStr?: string): NativeDateDayjs {
    if (input === undefined) {
      return new NativeDateDayjs(new Date());
    }

    let date: Date;
    if (typeof input === "string") {
      date = new Date(input);
    } else {
      date = new Date(input);
    }

    const adapter = new NativeDateDayjs(date);
    adapter._timezone = "UTC";
    return adapter;
  }

  static tz(input: any, timezone?: string): NativeDateDayjs {
    let date: Date;
    if (typeof input === "string") {
      date = new Date(input);
    } else {
      date = new Date(input);
    }

    const adapter = new NativeDateDayjs(date);
    adapter._timezone = timezone || null;
    return adapter;
  }

  static max(...dates: (NativeDateDayjs | Date | DayjsType)[]): NativeDateDayjs {
    const jsDates = dates.map((d) => {
      if (d instanceof NativeDateDayjs) return d._date;
      if (d instanceof Date) return d;
      return new Date(d.valueOf());
    });
    const maxDate = new Date(Math.max(...jsDates.map((d) => d.getTime())));
    return new NativeDateDayjs(maxDate);
  }

  static min(...dates: (NativeDateDayjs | Date | DayjsType)[]): NativeDateDayjs {
    const jsDates = dates.map((d) => {
      if (d instanceof NativeDateDayjs) return d._date;
      if (d instanceof Date) return d;
      return new Date(d.valueOf());
    });
    const minDate = new Date(Math.min(...jsDates.map((d) => d.getTime())));
    return new NativeDateDayjs(minDate);
  }

  format(formatStr = "YYYY-MM-DD HH:mm:ss"): string {
    if (this._timezone && this._timezone !== "UTC") {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: this._timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };

      const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(this._date);
      const year = parts.find((p) => p.type === "year")?.value || "0";
      const month = parts.find((p) => p.type === "month")?.value || "0";
      const day = parts.find((p) => p.type === "day")?.value || "0";
      const hour = parts.find((p) => p.type === "hour")?.value || "0";
      const minute = parts.find((p) => p.type === "minute")?.value || "0";
      const second = parts.find((p) => p.type === "second")?.value || "0";

      return formatStr
        .replace(/YYYY/g, year)
        .replace(/MM/g, month)
        .replace(/DD/g, day)
        .replace(/HH/g, hour)
        .replace(/mm/g, minute)
        .replace(/ss/g, second);
    }

    let result = formatStr;
    result = result.replace(/YYYY/g, this._date.getFullYear().toString());
    result = result.replace(/MM/g, (this._date.getMonth() + 1).toString().padStart(2, "0"));
    result = result.replace(/DD/g, this._date.getDate().toString().padStart(2, "0"));
    result = result.replace(/HH/g, this._date.getHours().toString().padStart(2, "0"));
    result = result.replace(/mm/g, this._date.getMinutes().toString().padStart(2, "0"));
    result = result.replace(/ss/g, this._date.getSeconds().toString().padStart(2, "0"));

    return result;
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
    const adapter = new NativeDateDayjs(this._date);
    adapter._timezone = "UTC";
    adapter.$x = { $timezone: "UTC" };
    return adapter;
  }

  tz(timezone?: string, keepLocalTime?: boolean): any {
    if (!timezone) return this;

    if (keepLocalTime) {
      const year = this._date.getFullYear();
      const month = this._date.getMonth();
      const day = this._date.getDate();
      const hours = this._date.getHours();
      const minutes = this._date.getMinutes();
      const seconds = this._date.getSeconds();
      const ms = this._date.getMilliseconds();

      const newDate = new Date(year, month, day, hours, minutes, seconds, ms);
      const adapter = new NativeDateDayjs(newDate);
      adapter._timezone = timezone;
      adapter.$x = { $timezone: timezone };
      return adapter;
    }

    const adapter = new NativeDateDayjs(this._date);
    adapter._timezone = timezone;
    adapter.$x = { $timezone: timezone };
    return adapter;
  }

  utcOffset(): any {
    if (this._timezone === "UTC") {
      return 0;
    }
    if (this._timezone) {
      return this._getTimezoneOffset(this._timezone);
    }
    return -this._date.getTimezoneOffset();
  }

  add(amount: number, unit: string): any {
    const newDate = new Date(this._date);
    switch (unit) {
      case "minute":
      case "minutes":
        newDate.setMinutes(newDate.getMinutes() + amount);
        break;
      case "hour":
      case "hours":
        newDate.setHours(newDate.getHours() + amount);
        break;
      case "day":
      case "days":
        newDate.setDate(newDate.getDate() + amount);
        break;
      case "week":
      case "weeks":
        newDate.setDate(newDate.getDate() + amount * 7);
        break;
      case "month":
      case "months":
        newDate.setMonth(newDate.getMonth() + amount);
        break;
      case "year":
      case "years":
        newDate.setFullYear(newDate.getFullYear() + amount);
        break;
    }

    const adapter = new NativeDateDayjs(newDate);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  subtract(amount: number, unit: string): any {
    return this.add(-amount, unit);
  }

  startOf(unit: string): any {
    const newDate = new Date(this._date);
    switch (unit) {
      case "day":
        newDate.setHours(0, 0, 0, 0);
        break;
      case "hour":
        newDate.setMinutes(0, 0, 0);
        break;
      case "week":
        const day = newDate.getDay();
        const diff = newDate.getDate() - day;
        newDate.setDate(diff);
        newDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        newDate.setDate(1);
        newDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        newDate.setMonth(0, 1);
        newDate.setHours(0, 0, 0, 0);
        break;
    }

    const adapter = new NativeDateDayjs(newDate);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  endOf(unit: string): any {
    const newDate = new Date(this._date);
    switch (unit) {
      case "day":
        newDate.setHours(23, 59, 59, 999);
        break;
      case "hour":
        newDate.setMinutes(59, 59, 999);
        break;
      case "week":
        const day = newDate.getDay();
        const diff = newDate.getDate() - day + 6;
        newDate.setDate(diff);
        newDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + 1, 0);
        newDate.setHours(23, 59, 59, 999);
        break;
      case "year":
        newDate.setMonth(11, 31);
        newDate.setHours(23, 59, 59, 999);
        break;
    }

    const adapter = new NativeDateDayjs(newDate);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  hour(value?: number): any {
    if (value === undefined) {
      return this._date.getUTCHours();
    }
    const newDate = new Date(this._date);
    newDate.setUTCHours(value);
    const adapter = new NativeDateDayjs(newDate);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  minute(value?: number): any {
    if (value === undefined) {
      return this._date.getUTCMinutes();
    }
    const newDate = new Date(this._date);
    newDate.setUTCMinutes(value);
    const adapter = new NativeDateDayjs(newDate);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  second(value?: number): any {
    if (value === undefined) {
      return this._date.getUTCSeconds();
    }
    const newDate = new Date(this._date);
    newDate.setUTCSeconds(value);
    const adapter = new NativeDateDayjs(newDate);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  day(): number {
    return this._date.getDay();
  }

  isBefore(other: NativeDateDayjs | Date | string | DayjsType): boolean {
    let otherDate: Date;
    if (other instanceof NativeDateDayjs) {
      otherDate = other._date;
    } else if (other instanceof Date) {
      otherDate = other;
    } else if (typeof other === "string") {
      otherDate = new Date(other);
    } else {
      otherDate = new Date(other.valueOf());
    }
    return this._date < otherDate;
  }

  isAfter(other: NativeDateDayjs | Date | string | DayjsType): boolean {
    let otherDate: Date;
    if (other instanceof NativeDateDayjs) {
      otherDate = other._date;
    } else if (other instanceof Date) {
      otherDate = other;
    } else if (typeof other === "string") {
      otherDate = new Date(other);
    } else {
      otherDate = new Date(other.valueOf());
    }
    return this._date > otherDate;
  }

  isBetween(start: any, end: any, granularity?: string | null, inclusivity?: string): boolean {
    let startDate: Date;
    let endDate: Date;

    if (start instanceof NativeDateDayjs) {
      startDate = start._date;
    } else if (start instanceof Date) {
      startDate = start;
    } else {
      startDate = new Date(start);
    }

    if (end instanceof NativeDateDayjs) {
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
    return this._date instanceof Date && !isNaN(this._date.getTime()) && isFinite(this._date.getTime());
  }

  diff(other: NativeDateDayjs | Date | string | DayjsType, unit?: string): number {
    let otherDate: Date;
    if (other instanceof NativeDateDayjs) {
      otherDate = other._date;
    } else if (other instanceof Date) {
      otherDate = other;
    } else if (typeof other === "string") {
      otherDate = new Date(other);
    } else {
      otherDate = new Date(other.valueOf());
    }

    const diffMs = this._date.getTime() - otherDate.getTime();

    switch (unit) {
      case "minute":
      case "minutes":
        return Math.floor(diffMs / (1000 * 60));
      case "hour":
      case "hours":
        return Math.floor(diffMs / (1000 * 60 * 60));
      case "day":
      case "days":
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case "week":
      case "weeks":
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      case "month":
      case "months":
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      case "year":
      case "years":
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      default:
        return diffMs;
    }
  }

  clone(): any {
    const adapter = new NativeDateDayjs(this._date);
    adapter._timezone = this._timezone;
    adapter.$x = { $timezone: this._timezone || undefined };
    return adapter;
  }

  private _convertToTimezone(date: Date, timezone: string): Date {
    if (timezone === "UTC") {
      return new Date(date.getTime());
    }

    const utcTime = date.getTime();
    const utcDate = new Date(utcTime);

    const targetTimeString = utcDate.toLocaleString("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const [datePart, timePart] = targetTimeString.split(", ");
    const [year, month, day] = datePart.split("-");
    const [hour, minute, second] = timePart.split(":");

    const targetDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );

    return targetDate;
  }

  private _getTimezoneOffset(timezone: string): number {
    if (timezone === "UTC") return 0;

    const testDate = this._date;
    const utcTime = testDate.getTime();

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(testDate);
    const partsObj: Record<string, string> = {};
    parts.forEach((part) => {
      if (part.type !== "literal") {
        partsObj[part.type] = part.value;
      }
    });

    const localTime = new Date(
      parseInt(partsObj.year),
      parseInt(partsObj.month) - 1,
      parseInt(partsObj.day),
      parseInt(partsObj.hour),
      parseInt(partsObj.minute),
      parseInt(partsObj.second)
    ).getTime();

    return (localTime - utcTime) / 60000;
  }
}

function nativeDateDayjs(
  input?: any,
  formatStr?: string,
  locale?: string,
  strict?: boolean
): NativeDateDayjs {
  return new NativeDateDayjs(input, formatStr, locale, strict);
}

nativeDateDayjs.utc = NativeDateDayjs.utc;
nativeDateDayjs.tz = NativeDateDayjs.tz;
nativeDateDayjs.max = NativeDateDayjs.max;
nativeDateDayjs.min = NativeDateDayjs.min;
nativeDateDayjs.extend = () => {
  return;
};

export default nativeDateDayjs;
