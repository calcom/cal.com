// handles logic related to user clock display using 24h display / timeZone options.
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

interface TimeOptions {
  inviteeTimeZone: string;
}

const timeOptions: TimeOptions = {
  inviteeTimeZone: "",
};

const isInitialized = false;

const initClock = () => {
  if (typeof localStorage === "undefined" || isInitialized) {
    return;
  }
  timeOptions.inviteeTimeZone = localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess();
};

function setTimeZone(selectedTimeZone: string) {
  localStorage.setItem("timeOption.preferredTimeZone", selectedTimeZone);
  timeOptions.inviteeTimeZone = selectedTimeZone;
}

const timeZone = (selectedTimeZone?: string) => {
  initClock();
  if (selectedTimeZone) setTimeZone(selectedTimeZone);
  return timeOptions.inviteeTimeZone;
};

export { timeZone };
