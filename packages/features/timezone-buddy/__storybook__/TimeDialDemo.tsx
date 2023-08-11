import { TimeDial } from "../components/TimeDial";
import { TBContext, createTimezoneBuddyStore } from "../store";

export function TimeDialDemo() {
  return (
    <TBContext.Provider
      value={createTimezoneBuddyStore({
        offsetTimezone: "America/New_York",
        uniquedTimezones: [
          "America/New_York",
          "America/Los_Angeles",
          "Europe/London",
          "Asia/Tokyo",
          "Africa/Cairo",
          "Australia/Sydney",
          "Australia/Sydney",
          "Australia/Sydney",
          "Australia/Sydney",
          "Pacific/Auckland",
          "Asia/Dubai",
          "Europe/Paris",
          "America/Chicago",
          "Asia/Shanghai",
        ],
      })}>
      <TimeDial timezone="Europe/London" />
      <TimeDial timezone="America/Los_Angeles" />
      <TimeDial timezone="Asia/Dubai" />
    </TBContext.Provider>
  );
}
