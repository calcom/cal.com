import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";

const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;

export class RemoveAppPushSubscriptionInput {
  @IsString()
  @IsNotEmpty()
  @Matches(EXPO_PUSH_TOKEN_REGEX, {
    message: "token must be a valid Expo Push Token (ExponentPushToken[...])",
  })
  @ApiProperty({
    description: "Expo Push Token to remove",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  token!: string;
}
