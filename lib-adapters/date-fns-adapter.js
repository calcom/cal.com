const {
  format,
  parseISO,
  addMinutes,
  addDays,
  addHours,
  subMinutes,
  subDays,
  subHours,
  startOfDay,
  endOfDay,
  startOfHour,
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
  max,
  min,
} = require('date-fns');

const dateFnsTz = require('date-fns-tz');
const { fromZonedTime, toZonedTime, getTimezoneOffset } = dateFnsTz;

class DateFnsAdapter {
  constructor(input, formatStr, locale, strict) {
    if (input instanceof DateFnsAdapter) {
      this._date = new Date(input._date);
      this._timezone = input._timezone;
    } else if (input instanceof Date) {
      this._date = new Date(input);
      this._timezone = null;
    } else if (input === undefined || input === null) {
      this._date = new Date();
      this._timezone = null;
    } else if (typeof input === 'string') {
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

  static utc(input, formatStr) {
    if (input === undefined) {
      return new DateFnsAdapter(new Date());
    }
    
    let date;
    if (typeof input === 'string') {
      date = parseISO(input);
    } else {
      date = new Date(input);
    }
    
    const adapter = new DateFnsAdapter(date);
    adapter._timezone = 'UTC';
    return adapter;
  }

  static tz(input, timezone) {
    let date;
    if (typeof input === 'string') {
      date = parseISO(input);
    } else {
      date = new Date(input);
    }
    
    const adapter = new DateFnsAdapter(date);
    adapter._timezone = timezone;
    return adapter;
  }

  static max(...dates) {
    const jsDates = dates.map(d => d instanceof DateFnsAdapter ? d._date : d);
    const maxDate = max(jsDates);
    return new DateFnsAdapter(maxDate);
  }

  static min(...dates) {
    const jsDates = dates.map(d => d instanceof DateFnsAdapter ? d._date : d);
    const minDate = min(jsDates);
    return new DateFnsAdapter(minDate);
  }

  format(formatStr = 'yyyy-MM-dd HH:mm:ss') {
    const dateFnsFormat = formatStr
      .replace(/YYYY/g, 'yyyy')
      .replace(/MM/g, 'LL')
      .replace(/DD/g, 'dd')
      .replace(/HH/g, 'HH')
      .replace(/mm/g, 'mm')
      .replace(/ss/g, 'ss');
    
    let dateToFormat = this._date;
    if (this._timezone && this._timezone !== 'UTC') {
      try {
        dateToFormat = toZonedTime(this._date, this._timezone);
      } catch {
        dateToFormat = this._date;
      }
    }
    
    return format(dateToFormat, dateFnsFormat);
  }

  toISOString() {
    return this._date.toISOString();
  }

  toDate() {
    return new Date(this._date);
  }

  valueOf() {
    return this._date.valueOf();
  }

  utc() {
    const adapter = new DateFnsAdapter(this._date);
    adapter._timezone = 'UTC';
    return adapter;
  }

  tz(timezone) {
    const adapter = new DateFnsAdapter(this._date);
    adapter._timezone = timezone;
    return adapter;
  }

  utcOffset() {
    if (this._timezone && this._timezone !== 'UTC') {
      try {
        return -getTimezoneOffset(this._timezone, this._date) / (1000 * 60);
      } catch {
        return -this._date.getTimezoneOffset();
      }
    }
    return -this._date.getTimezoneOffset();
  }

  add(amount, unit) {
    let newDate;
    switch (unit) {
      case 'minute':
      case 'minutes':
        newDate = addMinutes(this._date, amount);
        break;
      case 'hour':
      case 'hours':
        newDate = addHours(this._date, amount);
        break;
      case 'day':
      case 'days':
        newDate = addDays(this._date, amount);
        break;
      default:
        newDate = new Date(this._date);
    }
    
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  subtract(amount, unit) {
    let newDate;
    switch (unit) {
      case 'minute':
      case 'minutes':
        newDate = subMinutes(this._date, amount);
        break;
      case 'hour':
      case 'hours':
        newDate = subHours(this._date, amount);
        break;
      case 'day':
      case 'days':
        newDate = subDays(this._date, amount);
        break;
      default:
        newDate = new Date(this._date);
    }
    
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  startOf(unit) {
    let newDate;
    switch (unit) {
      case 'day':
        newDate = startOfDay(this._date);
        break;
      case 'hour':
        newDate = startOfHour(this._date);
        break;
      default:
        newDate = new Date(this._date);
    }
    
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  endOf(unit) {
    let newDate;
    switch (unit) {
      case 'day':
        newDate = endOfDay(this._date);
        break;
      default:
        newDate = new Date(this._date);
    }
    
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  hour(value) {
    if (value === undefined) {
      return getHours(this._date);
    }
    const newDate = setHours(this._date, value);
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  minute(value) {
    if (value === undefined) {
      return getMinutes(this._date);
    }
    const newDate = setMinutes(this._date, value);
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  second(value) {
    if (value === undefined) {
      return getSeconds(this._date);
    }
    const newDate = setSeconds(this._date, value);
    const adapter = new DateFnsAdapter(newDate);
    adapter._timezone = this._timezone;
    return adapter;
  }

  day() {
    return getDay(this._date);
  }

  isBefore(other) {
    const otherDate = other instanceof DateFnsAdapter ? other._date : other;
    return isBefore(this._date, otherDate);
  }

  isAfter(other) {
    const otherDate = other instanceof DateFnsAdapter ? other._date : other;
    return isAfter(this._date, otherDate);
  }

  isBetween(start, end, granularity, inclusivity) {
    const startDate = start instanceof DateFnsAdapter ? start._date : start;
    const endDate = end instanceof DateFnsAdapter ? end._date : end;
    
    if (inclusivity === '[]') {
      return (this._date >= startDate && this._date <= endDate);
    }
    return (this._date > startDate && this._date < endDate);
  }

  isValid() {
    return isValid(this._date);
  }

  diff(other, unit) {
    const otherDate = other instanceof DateFnsAdapter ? other._date : other;
    
    switch (unit) {
      case 'minute':
      case 'minutes':
        return differenceInMinutes(this._date, otherDate);
      case 'day':
      case 'days':
        return differenceInDays(this._date, otherDate);
      default:
        return this._date.getTime() - otherDate.getTime();
    }
  }
}

function dateFnsDayjs(input, formatStr, locale, strict) {
  return new DateFnsAdapter(input, formatStr, locale, strict);
}

dateFnsDayjs.utc = DateFnsAdapter.utc;
dateFnsDayjs.tz = DateFnsAdapter.tz;
dateFnsDayjs.max = DateFnsAdapter.max;
dateFnsDayjs.min = DateFnsAdapter.min;

dateFnsDayjs.extend = () => {};

module.exports = dateFnsDayjs;
