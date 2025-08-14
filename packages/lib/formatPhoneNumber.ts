import { parsePhoneNumberWithError } from "libphonenumber-js";

export const formatPhoneNumber = (phoneNumber: string) => {
  const parsedPhoneNumber = parsePhoneNumberWithError(phoneNumber);
  if (parsedPhoneNumber.isValid()) {
    return parsedPhoneNumber.formatInternational();
  }
  return phoneNumber;
};
