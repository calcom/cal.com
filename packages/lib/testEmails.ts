declare global {
  // eslint-disable-next-line no-var
  var testEmails: {
    icalEvent?: {
      filename: string;
      content: string;
    };
    to: string;
    from: string | { email: string; name: string };
    subject: string;
    html: string;
  }[];
}

export const setTestEmail = (email: (typeof globalThis.testEmails)[number]) => {
  globalThis.testEmails = globalThis.testEmails || [];
  globalThis.testEmails.push(email);
};

export const getTestEmails = () => {
  return globalThis.testEmails;
};

export const resetTestEmails = () => {
  globalThis.testEmails = [];
};
