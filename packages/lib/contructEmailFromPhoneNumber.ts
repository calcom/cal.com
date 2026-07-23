export const contructEmailFromPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return "";
  const cleanedPhoneNumber = phoneNumber.replace(/\+/g, "");
  return `${cleanedPhoneNumber}@sms.cal.com`;
};
