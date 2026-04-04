import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, Matches } from "class-validator";

enum AppPushPlatformEnum {
  IOS = "IOS",
  ANDROID = "ANDROID",
}

const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;

export class RegisterAppPushSubscriptionInput {
  @IsString()
  @IsNotEmpty()
  @Matches(EXPO_PUSH_TOKEN_REGEX, {
    message: "token must be a valid Expo Push Token (ExponentPushToken[...])",
  })
  @ApiProperty({ description: "Expo Push Token", example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" })
  token!: string;

  @IsEnum(AppPushPlatformEnum)
  @ApiProperty({ enum: AppPushPlatformEnum, description: "Mobile platform", example: "IOS" })
  platform!: "IOS" | "ANDROID";

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: "Unique device identifier", example: "device-uuid-123" })
  deviceId!: string;
}
