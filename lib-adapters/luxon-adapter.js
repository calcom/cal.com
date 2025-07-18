const { DateTime, Settings } = require('luxon');

class LuxonAdapter {
  constructor(input, format, locale, strict) {
    if (input instanceof LuxonAdapter) {
      this._dt = input._dt;
    } else if (input instanceof DateTime) {
      this._dt = input;
    } else if (input === undefined || input === null) {
      this._dt = DateTime.now();
    } else if (typeof input === 'string') {
      if (format) {
        this._dt = DateTime.fromFormat(input, format);
      } else {
        this._dt = DateTime.fromISO(input);
      }
    } else if (input instanceof Date) {
      this._dt = DateTime.fromJSDate(input);
    } else {
      this._dt = DateTime.now();
    }
  }

  static utc(input, format) {
    if (input === undefined) {
      return new LuxonAdapter(DateTime.utc());
    }
    if (typeof input === 'string') {
      const dt = format ? DateTime.fromFormat(input, format, { zone: 'utc' }) : DateTime.fromISO(input, { zone: 'utc' });
      return new LuxonAdapter(dt);
    }
    return new LuxonAdapter(DateTime.fromJSDate(input).toUTC());
  }

  static tz(input, timezone) {
    if (typeof input === 'string') {
      const dt = DateTime.fromISO(input, { zone: timezone });
      return new LuxonAdapter(dt);
    }
    return new LuxonAdapter(DateTime.fromJSDate(input).setZone(timezone));
  }

  static max(...dates) {
    const luxonDates = dates.map(d => d instanceof LuxonAdapter ? d._dt : DateTime.fromJSDate(d));
    const maxDate = DateTime.max(...luxonDates);
    return new LuxonAdapter(maxDate);
  }

  static min(...dates) {
    const luxonDates = dates.map(d => d instanceof LuxonAdapter ? d._dt : DateTime.fromJSDate(d));
    const minDate = DateTime.min(...luxonDates);
    return new LuxonAdapter(minDate);
  }

  format(formatStr = 'YYYY-MM-DD HH:mm:ss') {
    const luxonFormat = formatStr
      .replace(/YYYY/g, 'yyyy')
      .replace(/MM/g, 'LL')
      .replace(/DD/g, 'dd')
      .replace(/HH/g, 'HH')
      .replace(/mm/g, 'mm')
      .replace(/ss/g, 'ss');
    
    return this._dt.toFormat(luxonFormat);
  }

  toISOString() {
    return this._dt.toISO();
  }

  toDate() {
    return this._dt.toJSDate();
  }

  valueOf() {
    return this._dt.valueOf();
  }

  utc() {
    return new LuxonAdapter(this._dt.toUTC());
  }

  tz(timezone) {
    return new LuxonAdapter(this._dt.setZone(timezone));
  }

  utcOffset() {
    return this._dt.offset;
  }

  add(amount, unit) {
    const luxonUnit = unit === 'minute' ? 'minutes' : unit === 'day' ? 'days' : unit;
    return new LuxonAdapter(this._dt.plus({ [luxonUnit]: amount }));
  }

  subtract(amount, unit) {
    const luxonUnit = unit === 'minute' ? 'minutes' : unit === 'day' ? 'days' : unit;
    return new LuxonAdapter(this._dt.minus({ [luxonUnit]: amount }));
  }

  startOf(unit) {
    return new LuxonAdapter(this._dt.startOf(unit));
  }

  endOf(unit) {
    return new LuxonAdapter(this._dt.endOf(unit));
  }

  hour(value) {
    if (value === undefined) return this._dt.hour;
    return new LuxonAdapter(this._dt.set({ hour: value }));
  }

  minute(value) {
    if (value === undefined) return this._dt.minute;
    return new LuxonAdapter(this._dt.set({ minute: value }));
  }

  second(value) {
    if (value === undefined) return this._dt.second;
    return new LuxonAdapter(this._dt.set({ second: value }));
  }

  day() {
    return this._dt.weekday === 7 ? 0 : this._dt.weekday; // Convert to dayjs format (0 = Sunday)
  }

  isBefore(other) {
    const otherDt = other instanceof LuxonAdapter ? other._dt : DateTime.fromJSDate(other);
    return this._dt < otherDt;
  }

  isAfter(other) {
    const otherDt = other instanceof LuxonAdapter ? other._dt : DateTime.fromJSDate(other);
    return this._dt > otherDt;
  }

  isBetween(start, end, granularity, inclusivity) {
    const startDt = start instanceof LuxonAdapter ? start._dt : DateTime.fromJSDate(start);
    const endDt = end instanceof LuxonAdapter ? end._dt : DateTime.fromJSDate(end);
    
    if (inclusivity === '[]') {
      return this._dt >= startDt && this._dt <= endDt;
    }
    return this._dt > startDt && this._dt < endDt;
  }

  isValid() {
    return this._dt.isValid;
  }

  diff(other, unit) {
    const otherDt = other instanceof LuxonAdapter ? other._dt : DateTime.fromJSDate(other);
    return this._dt.diff(otherDt, unit).as(unit);
  }
}

function luxonDayjs(input, format, locale, strict) {
  return new LuxonAdapter(input, format, locale, strict);
}

luxonDayjs.utc = LuxonAdapter.utc;
luxonDayjs.tz = LuxonAdapter.tz;
luxonDayjs.max = LuxonAdapter.max;
luxonDayjs.min = LuxonAdapter.min;

luxonDayjs.extend = () => {};

module.exports = luxonDayjs;
