import { parsePhoneNumberWithError } from "libphonenumber-js/max";

export const formatPhoneNumber = (phoneNumber: string) => {
  const parsedPhoneNumber = parsePhoneNumberWithError(phoneNumber);
  return parsedPhoneNumber?.isValid() ? parsedPhoneNumber.formatInternational() : phoneNumber;
};
