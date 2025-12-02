export interface HolidayDate {
  year: number;
  date: string; // ISO date string YYYY-MM-DD
}

export interface Holiday {
  id: string;
  name: string;
  type: string;
  dates: HolidayDate[];
}

export interface CountryHolidays {
  code: string;
  name: string;
  holidays: Holiday[];
}

export interface HolidayData {
  generatedAt: string;
  yearsIncluded: number[];
  countries: CountryHolidays[];
}

export interface Country {
  code: string;
  name: string;
}

export interface HolidayWithStatus extends Holiday {
  enabled: boolean;
  nextDate: string | null;
}

