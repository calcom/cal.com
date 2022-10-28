export default function findDurationType(value: number) {
  if (value % 1440 == 0) {
    return "days";
  } else if (value % 60 == 0) {
    return "hours";
  } else {
    return "minutes";
  }
}
