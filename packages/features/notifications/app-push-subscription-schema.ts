import { z } from "zod";

const APP_PUSH_PLATFORMS = ["IOS", "ANDROID"] as const;
const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;

export const appPushPlatformSchema = z.enum(APP_PUSH_PLATFORMS);

export type AppPushPlatform = z.infer<typeof appPushPlatformSchema>;

export const registerAppPushSubscriptionSchema = z.object({
  token: z
    .string()
    .min(1, "token is required")
    .regex(EXPO_PUSH_TOKEN_REGEX, "token must be a valid Expo Push Token"),
  platform: appPushPlatformSchema,
  deviceId: z.string().min(1, "deviceId is required"),
});

export type RegisterAppPushSubscriptionInput = z.infer<typeof registerAppPushSubscriptionSchema>;

export const removeAppPushSubscriptionSchema = z.object({
  token: z
    .string()
    .min(1, "token is required")
    .regex(EXPO_PUSH_TOKEN_REGEX, "token must be a valid Expo Push Token"),
});

export type RemoveAppPushSubscriptionInput = z.infer<typeof removeAppPushSubscriptionSchema>;
