// Function to extract base email
export const extractBaseEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  const baseLocalPart = localPart.split("+")[0];
  return `${baseLocalPart}@${domain}`;
};
