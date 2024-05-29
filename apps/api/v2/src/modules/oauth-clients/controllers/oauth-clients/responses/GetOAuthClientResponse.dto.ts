import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  ValidateNested,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsNotEmptyObject,
} from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class PlatformOAuthClientDto {
  @ApiProperty({ example: "clsx38nbl0001vkhlwin9fmt0" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "MyClient" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "secretValue" })
  @IsString()
  secret!: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  permissions!: number;

  @ApiProperty({ example: "https://example.com/logo.png", required: false })
  @IsOptional()
  @IsString()
  logo!: string | null;

  @ApiProperty({ example: ["https://example.com/callback"] })
  @IsArray()
  @IsString({ each: true })
  redirectUris!: string[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  organizationId!: number;

  @ApiProperty({ example: "2024-03-23T08:33:21.851Z", type: Date })
  @IsDate()
  createdAt!: Date;
}

export class GetOAuthClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: PlatformOAuthClientDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PlatformOAuthClientDto)
  data!: PlatformOAuthClientDto;
}
