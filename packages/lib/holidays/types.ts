export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO date string YYYY-MM-DD
  year: number;
}

export interface Country {
  code: string;
  name: string;
}

export interface HolidayWithStatus extends Holiday {
  enabled: boolean;
}
