import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, IsNumber, IsString, ValidateNested } from "class-validator";

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
