import { ERROR_STATUS, REDIRECT_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreateOAuthClientOutput } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNotEmptyObject, ValidateNested } from "class-validator";

export class CreateOAuthClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsIn([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    example: {
      clientId: "clsx38nbl0001vkhlwin9fmt0",
      clientSecret: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoib2F1dGgtY2xpZW50Iiwi",
    },
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => CreateOAuthClientOutput)
  data!: CreateOAuthClientOutput;
}

export class CreateOauthClientRedirect {
  status!: typeof REDIRECT_STATUS;

  url!: string;
}
