import { User, ApiKey } from "@calcom/prisma/client";

// Base response, used for all responses
export type BaseResponse = {
  message?: string;
  error?: Error;
};
// User
export type UserResponse = BaseResponse & {
  data?: Partial<User>;
};
export type UsersResponse = BaseResponse & {
  data?: Partial<User>[];
};

// API Key
export type ApiKeyResponse = BaseResponse & {
  data?: Partial<ApiKey>;
};
export type ApiKeysResponse = BaseResponse & {
  data?: Partial<ApiKey>[];
};
