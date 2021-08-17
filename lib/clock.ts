// handles logic related to user clock display using 24h display / timeZone options.
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface TimeOptions {
  is24hClock: boolean;
  inviteeTimeZone: string;
}

const timeOptions: TimeOptions = {
  is24hClock: false,
  inviteeTimeZone: "",
};

const isInitialized = false;

const initClock = () => {
  if (typeof localStorage === "undefined" || isInitialized) {
    return;
  }
  timeOptions.is24hClock = localStorage.getItem("timeOption.is24hClock") === "true";
  timeOptions.inviteeTimeZone = localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess();
};

const is24h = (is24hClock?: boolean) => {
  initClock();
  if (typeof is24hClock !== "undefined") set24hClock(is24hClock);
  return timeOptions.is24hClock;
};

const set24hClock = (is24hClock: boolean) => {
  localStorage.setItem("timeOption.is24hClock", is24hClock.toString());
  timeOptions.is24hClock = is24hClock;
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

export { is24h, timeZone };
