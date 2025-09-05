import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsString, ValidateNested } from "class-validator";

export class CreateIcsFeedOutput {
  @IsInt()
  @Expose()
  @ApiProperty({ example: 1234567890, description: "The id of the calendar credential" })
  readonly id!: number;

  @IsString()
  @Expose()
  @ApiProperty({ example: "ics-feed_calendar", description: "The type of the calendar" })
  readonly type!: string;

  @IsInt()
  @Expose()
  @ApiProperty({
    example: 1234567890,
    description: "The user id of the user that created the calendar",
    type: "integer",
  })
  readonly userId!: number | null;

  @IsInt()
  @Expose()
  @ApiProperty({
    example: 1234567890,
    nullable: true,
    description: "The team id of the user that created the calendar",
    type: "integer",
  })
  readonly teamId!: number | null;

  @IsString()
  @Expose()
  @ApiProperty({ example: "ics-feed", description: "The slug of the calendar" })
  readonly appId!: string | null;

  @IsBoolean()
  @Expose()
  @ApiProperty({ example: false, description: "Whether the calendar credentials are valid or not" })
  readonly invalid!: boolean | null;
}

export class CreateIcsFeedOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => CreateIcsFeedOutput)
  data!: CreateIcsFeedOutput;
}
