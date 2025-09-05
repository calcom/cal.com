import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ScheduleOutput } from "@/ee/schedules/schedules_2024_04_15/outputs/schedule.output";

export class UserVerifiedEmailOutputData {
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
  })
  userId!: number;
}

export class TeamVerifiedEmailOutputData {
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
    description: "The ID of the associated team, if applicable.",
    example: 89,
  })
  teamId!: number;

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
}

export class TeamVerifiedEmailOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @Type(() => TeamVerifiedEmailOutputData)
  data!: TeamVerifiedEmailOutputData;
}

export class UserVerifiedEmailOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @Type(() => UserVerifiedEmailOutputData)
  data!: UserVerifiedEmailOutputData;
}

export class TeamVerifiedEmailsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamVerifiedEmailOutputData)
  data!: TeamVerifiedEmailOutputData[];
}

export class UserVerifiedEmailsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserVerifiedEmailOutputData)
  data!: UserVerifiedEmailOutputData[];
}
