export const getTranslation = jest.fn().mockResolvedValue({ t: (key: string) => key });
export const verifyPhoneNumber = jest.fn();
export const sendVerificationCode = jest.fn();
export const createApiKeyHandler = jest.fn();
export const CreationSource = { API_V2: "API_V2", API: "API", WEBAPP: "WEBAPP" };
