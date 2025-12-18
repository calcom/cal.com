import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class OAuth2AuthorizeDto {
  @ApiProperty({
    description: "The authorization code",
    example: "abc123xyz",
  })
  @IsString()
  @Expose()
  authorizationCode!: string;
}

export class OAuth2AuthorizeResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OAuth2AuthorizeDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => OAuth2AuthorizeDto)
  @Expose()
  data!: OAuth2AuthorizeDto;
}
