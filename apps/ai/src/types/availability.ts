export type Availability = {
  busy: {
    start: string;
    end: string;
    title?: string;
  }[];
  timeZone: string;
  dateRanges: {
    start: string;
    end: string;
  }[];
  workingHours: {
    days: number[];
    startTime: number;
    endTime: number;
    userId: number;
  }[];
  dateOverrides: {
    date: string;
    startTime: number;
    endTime: number;
    userId: number;
  };
  currentSeats: number;
};
