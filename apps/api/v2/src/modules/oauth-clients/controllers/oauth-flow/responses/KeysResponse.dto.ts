import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested, IsEnum, IsString, IsNotEmptyObject, IsNumber } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class KeysDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  })
  @IsString()
  accessToken!: string;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  })
  @IsString()
  refreshToken!: string;

  @IsNumber()
  accessTokenExpiresAt!: number;

  @IsNumber()
  refreshTokenExpiresAt!: number;
}

export class KeysResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: KeysDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => KeysDto)
  data!: KeysDto;
}
