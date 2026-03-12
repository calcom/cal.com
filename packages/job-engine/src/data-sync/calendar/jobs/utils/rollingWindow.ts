export const ROLLING_WINDOW_PAST_DAYS = 30;
export const ROLLING_WINDOW_FUTURE_DAYS = 90;
export const MAX_OCCURRENCES_CAP = 730;

export interface RollingWindow {
  windowStart: Date;
  windowEnd: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const getRollingWindow = (now: Date = new Date()): RollingWindow => {
  return {
    windowStart: new Date(now.getTime() - ROLLING_WINDOW_PAST_DAYS * DAY_MS),
    windowEnd: new Date(now.getTime() + ROLLING_WINDOW_FUTURE_DAYS * DAY_MS),
  };
};
