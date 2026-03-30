export interface TestEmailSmtpConfig {
  host: string;
  port: number;
  fromEmail: string;
  isCustomSmtp: boolean;
}

export interface TestEmail {
  icalEvent?: {
    filename: string;
    content: string;
  };
  to: string;
  from: string | { email: string; name: string };
  subject: string;
  html: string;
  smtpConfig?: TestEmailSmtpConfig;
}

declare global {
  // eslint-disable-next-line no-var
  var testEmails: TestEmail[];
}

export const setTestEmail = (email: TestEmail) => {
  globalThis.testEmails = globalThis.testEmails || [];
  globalThis.testEmails.push(email);
};

export const getTestEmails = (): TestEmail[] => {
  return globalThis.testEmails || [];
};

export const resetTestEmails = () => {
  globalThis.testEmails = [];
};
