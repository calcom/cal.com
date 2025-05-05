import { ScheduleOutput } from "@/ee/schedules/schedules_2024_04_15/outputs/schedule.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmptyObject,
  IsNumber,
  IsString,
  ValidateNested,
  IsOptional,
} from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class UserVerifiedPhoneOutputData {
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
    description: "The verified phone number.",
    example: "+37255556666",
    format: "phone",
  })
  phoneNumber!: string;

  @Expose()
  @IsNumber()
  @ApiProperty({
    description: "The ID of the associated user, if applicable.",
    example: 45,
  })
  userId!: number;
}

export class TeamVerifiedPhoneOutputData {
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
    description: "The verified phone number.",
    example: "+37255556666",
    format: "phone",
  })
  phoneNumber!: string;

  @Expose()
  @IsNumber()
  @IsOptional()
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
  })
  teamId!: number;
}

export class UserVerifiedPhoneOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @Type(() => UserVerifiedPhoneOutputData)
  data!: UserVerifiedPhoneOutputData;
}

export class TeamVerifiedPhoneOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @Type(() => TeamVerifiedPhoneOutputData)
  data!: TeamVerifiedPhoneOutputData;
}

export class UserVerifiedPhonesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserVerifiedPhoneOutputData)
  data!: UserVerifiedPhoneOutputData[];
}

export class TeamVerifiedPhonesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamVerifiedPhoneOutputData)
  data!: TeamVerifiedPhoneOutputData[];
}
