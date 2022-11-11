import { MINUTES_IN_DAY, MINUTES_IN_HOUR } from "./convertToNewDurationType";

export default function findDurationType(value: number) {
  if (value % MINUTES_IN_DAY === 0) return "days";
  if (value % MINUTES_IN_HOUR === 0) return "hours";
  return "minutes";
}
