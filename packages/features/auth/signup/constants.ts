export const SIGNUP_ERROR_CODES = {
  USER_ALREADY_EXISTS: "user_already_exists",
  INVALID_SERVER_RESPONSE: "invalid_server_response",
} as const;

export type SignupErrorCode = (typeof SIGNUP_ERROR_CODES)[keyof typeof SIGNUP_ERROR_CODES];
