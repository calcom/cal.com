import { MeOutput } from "@/ee/me/outputs/me.output";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmptyObject, IsOptional, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class UpdateMeOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: MeOutput,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => MeOutput)
  data!: MeOutput;

  @ApiPropertyOptional({
    description: "Indicates if the email has been changed",
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  hasEmailBeenChanged?: boolean;

  @ApiPropertyOptional({
    description: "Indicates if an email verification was sent",
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  sendEmailVerification?: boolean;
}
