import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, ValidateNested, IsNotEmptyObject, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS, REDIRECT_STATUS } from "@calcom/platform-constants";

class DataDto {
  @ApiProperty({
    example: "clsx38nbl0001vkhlwin9fmt0",
  })
  @IsString()
  clientId!: string;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoib2F1dGgtY2xpZW50Iiwi",
  })
  @IsString()
  clientSecret!: string;
}

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
  @Type(() => DataDto)
  data!: DataDto;
}

export class CreateOauthClientRedirect {
  status!: typeof REDIRECT_STATUS;

  url!: string;
}
