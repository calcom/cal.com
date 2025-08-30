declare global {
  // eslint-disable-next-line no-var
  var testSMS: {
    to: string;
    from: string;
    message: string;
  }[];
}

export const setTestSMS = (sms: (typeof globalThis.testSMS)[number]) => {
  globalThis.testSMS = globalThis.testSMS || [];
  globalThis.testSMS.push(sms);
};

export const getTestSMS = () => {
  return globalThis.testSMS;
};

export const resetTestSMS = () => {
  globalThis.testSMS = [];
};
