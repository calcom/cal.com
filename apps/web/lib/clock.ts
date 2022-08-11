// handles logic related to user clock display using 24h display / timeZone options.
import dayjs from "@calcom/dayjs";
import { isBrowserLocale24h } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";

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
  if (isInitialized) {
    return;
  }
  // This only sets browser locale if there's no preference on localStorage.
  if (!localStorage.getItem("timeOption.is24hClock")) set24hClock(isBrowserLocale24h());
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
