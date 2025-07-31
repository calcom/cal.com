const getBookingDataLocation = (
  location?:
    | {
        optionValue: string;
        value: string;
      }
    | undefined
) => {
  return location?.optionValue || location?.value || "";
};

export default getBookingDataLocation;
