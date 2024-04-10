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
  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new BadRequestException(`Invalid ${key} format. Expected format: HH:MM:SS. Received ${value}`);
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
