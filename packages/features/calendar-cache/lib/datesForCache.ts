/** Expand the start date to the beginning of the current month */
export const getTimeMin = (timeMin?: string) => {
  const date = timeMin ? new Date(timeMin) : new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/** Expand the end date to the end of the next month */
export function getTimeMax(timeMax?: string) {
  const date = timeMax ? new Date(timeMax) : new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}
