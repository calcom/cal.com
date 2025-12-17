import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class OAuth2AuthorizeDto {
  @ApiProperty({
    description: "The authorization code",
    example: "abc123xyz",
  })
  @IsString()
  authorizationCode!: string;
}

export class OAuth2AuthorizeResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OAuth2AuthorizeDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => OAuth2AuthorizeDto)
  data!: OAuth2AuthorizeDto;
}
