export type UserWithLegacySelectedCalendars<TCalendar, TUser> = TUser & {
  selectedCalendars: TCalendar[];
};

type UserWithSelectedCalendars<TCalendar, TUser> = Omit<TUser, "selectedCalendars"> & {
  allSelectedCalendars: TCalendar[];
  userLevelSelectedCalendars: TCalendar[];
};

export function withSelectedCalendars<
  TCalendar extends {
    eventTypeId: number | null;
  },
  TUser extends {
    selectedCalendars: TCalendar[];
  }
>(user: UserWithLegacySelectedCalendars<TCalendar, TUser>): UserWithSelectedCalendars<TCalendar, TUser> {
  // We are renaming selectedCalendars to allSelectedCalendars to make it clear that it contains all the calendars including eventType calendars
  const { selectedCalendars, ...restUser } = user;
  return {
    ...restUser,
    allSelectedCalendars: selectedCalendars,
    userLevelSelectedCalendars: selectedCalendars.filter((calendar) => !calendar.eventTypeId),
  };
}
