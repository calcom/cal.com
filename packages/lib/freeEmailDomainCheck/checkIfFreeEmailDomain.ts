import { freeEmailDomainsThatStartWithANumberObject, freeEmailDomains } from "./freeEmailDomains";

export const checkIfFreeEmailDomain = (email: string) => {
  const emailDomain = email.split("@")?.[1];
  // If there's no email domain return as if it was a free email domain
  if (!emailDomain) return true;

  // Gmail and Outlook are one of the most common email domains so we don't need to check the domains list
  if (emailDomain === "gmail.com" || emailDomain === "outlook.com") return true;

  // Determine if the email domain starts with a number
  const firstDigit = Number(emailDomain[0]);

  if (firstDigit) {
    const arrayOfEmailDomains =
      freeEmailDomainsThatStartWithANumberObject[
        firstDigit as keyof typeof freeEmailDomainsThatStartWithANumberObject
      ];
    return arrayOfEmailDomains.includes(emailDomain);
  }

  // Use binary search to see if the email domain exists in the list of free email domains
  let left = 0;
  let right = freeEmailDomains.length - 1;

  while (left <= right) {
    const midIndex = Math.floor((left + right) / 2);

    const middleEmailDomain = freeEmailDomains[midIndex];

    if (middleEmailDomain === emailDomain) {
      return true;
    }

    if (middleEmailDomain < emailDomain) {
      left = midIndex + 1;
    } else {
      right = midIndex - 1;
    }
  }

  return false;
};
