type Props = {
  days: number;
  hours?: number;
  minutes?: number;
};

export function getDateDaysFromNow({ days, hours, minutes }: Props) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  if (hours !== undefined) date.setUTCHours(hours, 0, 0, 0);
  if (minutes !== undefined) date.setUTCMinutes(minutes, 0, 0);
  return date;
}

export function getDateDaysBeforeNow({ days, hours, minutes }: Props) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  if (hours !== undefined) date.setUTCHours(hours, 0, 0, 0);
  if (minutes !== undefined) date.setUTCMinutes(minutes, 0, 0);
  return date;
}
