export const useFormatDuration = () => {
  const formatDuration = (mins: number, pageType: string): string => {
    if (pageType === "description") {
      if (mins < 60) {
        return `${mins}m`;
      } else {
        const hours = mins / 60;
        const formattedHours = hours % 1 === 0 ? Math.floor(hours) : hours.toFixed(2);
        return `${formattedHours}h`;
      }
    }
    if (pageType === "setup" || pageType === "duration") {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;

      let result = hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : "";
      result += remainingMins > 0 ? ` ${remainingMins} mins` : "";

      return result.trim();
    }
    return "";
  };

  return {
    formatDuration,
  };
};
