export default function convertToNewDurationType(prevType: string, newType: string, prevValue: number) {
  if (newType == "minutes") {
    if (prevType == "hours") {
      return prevValue * 60;
    }
    if (prevType == "days") {
      return prevValue * 1440;
    }
  } else if (newType == "hours") {
    if (prevType == "minutes") {
      return prevValue / 60;
    }
    if (prevType == "days") {
      return prevValue * 24;
    }
  } else if (newType == "days") {
    if (prevType == "minutes") {
      return prevValue / 1440;
    }
    if (prevType == "hours") {
      return prevValue / 24;
    }
  }
  return prevValue;
}
