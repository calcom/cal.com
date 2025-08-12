import { OutOfOfficeReason } from "@/modules/ooo/inputs/ooo.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsInt, IsEnum, ValidateNested, IsString, IsDateString, IsOptional } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class UserOooOutputDto {
  @IsInt()
  @Expose()
  @ApiProperty({
    description: "The ID of the user.",
    example: 2,
  })
  readonly userId!: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "The ID of the user covering for the out of office period, if applicable.",
    example: 2,
  })
  @Expose()
  readonly toUserId?: number;

  @IsInt()
  @Expose()
  @ApiProperty({
    description: "The ID of the ooo entry.",
    example: 2,
  })
  readonly id!: number;

  @IsString()
  @Expose()
  @ApiProperty({
    description: "The UUID of the ooo entry.",
    example: 2,
  })
  readonly uuid!: string;

  @IsDateString()
  @ApiProperty({
    description: "The start date and time of the out of office period in ISO 8601 format in UTC timezone.",
    example: "2023-05-01T00:00:00.000Z",
  })
  @Expose()
  start!: Date;

  @IsDateString()
  @ApiProperty({
    description: "The end date and time of the out of office period in ISO 8601 format in UTC timezone.",
    example: "2023-05-10T23:59:59.999Z",
  })
  @Expose()
  end!: Date;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Optional notes for the out of office entry.",
    example: "Vacation in Hawaii",
  })
  @Expose()
  notes?: string;

  @IsEnum(OutOfOfficeReason)
  @IsOptional()
  @ApiPropertyOptional({
    description: "the reason for the out of office entry, if applicable",
    example: "vacation",
    enum: OutOfOfficeReason,
  })
  @Expose()
  reason?: OutOfOfficeReason;
}

export class UserOooOutputResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => UserOooOutputDto)
  data!: UserOooOutputDto;
}

export class UserOoosOutputResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => UserOooOutputDto)
  data!: UserOooOutputDto[];
}
