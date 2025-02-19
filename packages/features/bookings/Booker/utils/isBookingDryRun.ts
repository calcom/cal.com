export const isBookingDryRun = (searchParams: URLSearchParams) => {
  return searchParams.get("cal.isBookingDryRun") === "true";
};
