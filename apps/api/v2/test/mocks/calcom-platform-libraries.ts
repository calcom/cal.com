export const getTranslation = jest.fn().mockResolvedValue({ t: (key: string) => key });
export const verifyPhoneNumber = jest.fn();
export const sendVerificationCode = jest.fn();
export const createApiKeyHandler = jest.fn();
export const credentialForCalendarServiceSelect = {
  id: true,
  type: true,
  key: true,
  userId: true,
  teamId: true,
  appId: true,
  invalid: true,
};
export const CreationSource = { API_V2: "API_V2", API: "API", WEBAPP: "WEBAPP" };
export const TimeUnit = { HOUR: "HOUR", MINUTE: "MINUTE", DAY: "DAY" };
export const WorkflowTriggerEvents = {
  BEFORE_EVENT: "BEFORE_EVENT",
  AFTER_EVENT: "AFTER_EVENT",
  NEW_EVENT: "NEW_EVENT",
};
