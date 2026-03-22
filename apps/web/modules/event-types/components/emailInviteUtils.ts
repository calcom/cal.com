import { emailRegex } from "@calcom/lib/emailSchema";

const EMAIL_SEPARATOR_REGEX = /[\s,;]+/;

export const parseEmails = (input: string) => {
  const uniqueEmails = new Set(
    input
      .split(EMAIL_SEPARATOR_REGEX)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  return Array.from(uniqueEmails);
};

export const normalizeAndValidateEmails = (input: string) => {
  const parsedEmails = parseEmails(input);
  const [validEmails, invalidEmails] = parsedEmails.reduce(
    (acc, email) => {
      if (emailRegex.test(email)) {
        acc[0].push(email);
      } else {
        acc[1].push(email);
      }
      return acc;
    },
    [[], []] as [string[], string[]]
  );

  return { validEmails, invalidEmails };
};
