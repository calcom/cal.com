export const filterAndFormatTimezones = (
  availableTimezones?: { city: string; timezone: string }[],
  timezonesFromProps?: string[]
) => {
  if (!Array.isArray(availableTimezones)) return [];

  if (Array.isArray(timezonesFromProps) && timezonesFromProps.length > 0) {
    return availableTimezones
      ?.filter((availableTimezone) => timezonesFromProps.includes(availableTimezone.timezone))
      .map(({ city, timezone }) => ({
        label: city,
        timezone,
      }));
  }

  return availableTimezones.map(({ city, timezone }) => ({
    label: city,
    timezone,
  }));
};
