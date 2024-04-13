import { BadRequestException } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, TransformFnParams } from "class-transformer";
import { IsArray, IsDate, IsNumber } from "class-validator";

export class CreateAvailabilityInput {
  @IsArray()
  @IsNumber({}, { each: true })
  @ApiProperty({ example: [1, 2] })
  days!: number[];

  @IsDate()
  @Transform(({ value, key }: TransformFnParams) => transformStringToDate(value, key))
  startTime!: Date;

  @IsDate()
  @Transform(({ value, key }: TransformFnParams) => transformStringToDate(value, key))
  endTime!: Date;
}

function transformStringToDate(value: string, key: string): Date {
  // note(Lauris): incoming value is ISO8061 e.g. 2025-0412T13:17:56.324Z
  const dateTimeParts = value.split("T");

  const timePart = dateTimeParts[1].split(".")[0]; // Removes milliseconds
  const parts = timePart.split(":");

  if (parts.length !== 3) {
    throw new BadRequestException(
      `Invalid time format. Expected format(ISO8061): 2025-0412T13:17:56.324Z. Received: ${value}`
    );
  }
  const [hours, minutes, seconds] = parts.map(Number);

  if (hours < 0 || hours > 23) {
    throw new BadRequestException(`Invalid ${key} hours. Expected value between 0 and 23`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new BadRequestException(`Invalid ${key} minutes. Expected value between 0 and 59`);
  }

  if (seconds < 0 || seconds > 59) {
    throw new BadRequestException(`Invalid ${key} seconds. Expected value between 0 and 59`);
  }

  return new Date(new Date().setUTCHours(hours, minutes, seconds, 0));
}
