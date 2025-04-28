import { ScheduleOutput } from "@/ee/schedules/schedules_2024_04_15/outputs/schedule.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmptyObject, IsNumber, IsString, ValidateNested } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class VerifiedEmailOutputData {
  @Expose()
  @IsNumber()
  @ApiProperty({
    description: "The unique identifier for the verified email.",
    example: 789,
  })
  id!: number;

  @Expose()
  @IsString()
  @ApiProperty({
    description: "The verified email address.",
    example: "user@example.com",
    format: "email",
  })
  email!: string;

  @Expose()
  @IsNumber()
  @ApiProperty({
    description: "The ID of the associated user, if applicable.",
    example: 45,
    nullable: true,
    required: false,
  })
  userId?: number | null;

  @Expose()
  @IsNumber()
  @ApiProperty({
    description: "The ID of the associated team, if applicable.",
    example: 89,
    nullable: true,
    required: false,
  })
  teamId?: number | null;
}

export class VerifiedEmailOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @Type(() => VerifiedEmailOutputData)
  data!: VerifiedEmailOutputData;
}

export class VerifiedEmailsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerifiedEmailOutputData)
  data!: VerifiedEmailOutputData[];
}
