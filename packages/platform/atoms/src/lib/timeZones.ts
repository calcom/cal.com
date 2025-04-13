export const formatTimezones = (
  timeZones: {
    city: string;
    timezone: string;
  }[]
) => {
  return timeZones.map(({ city, timezone }) => ({
    label: city,
    timezone,
  }));
};

export const filterPropsTimezones = (
  propsTimezones: string[],
  availableTimezones: { city: string; timezone: string }[]
) => {
  return availableTimezones.filter((availableTimezone) =>
    propsTimezones.includes(availableTimezone.timezone)
  );
};
