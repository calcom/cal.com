import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested, IsEnum, IsString, IsNotEmptyObject } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class DeletedOAuthClientDto {
  @ApiProperty({ example: "clsx38nbl0001vkhlwin9fmt0" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "MyClient" })
  @IsString()
  name!: string;
}

export class DeleteOAuthClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: DeletedOAuthClientDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => DeletedOAuthClientDto)
  data!: DeletedOAuthClientDto;
}
