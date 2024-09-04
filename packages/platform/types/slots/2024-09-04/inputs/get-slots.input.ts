import { Transform } from "class-transformer";
import {
  IsDateString,
  IsTimeZone,
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  ArrayMinSize,
} from "class-validator";

class GetAvailableSlotsInput_2024_09_04 {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;

  @IsTimeZone()
  @IsOptional()
  timeZone!: string;
}

export class ById_2024_09_04 extends GetAvailableSlotsInput_2024_09_04 {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  eventTypeId!: number;
}

export class BySlug_2024_09_04 extends GetAvailableSlotsInput_2024_09_04 {
  @IsString()
  eventTypeSlug!: string;
}

export class ByUsernames_2024_09_04 extends GetAvailableSlotsInput_2024_09_04 {
  @IsArray()
  @ArrayMinSize(2, { message: "The array must contain at least 2 elements." })
  @IsString({ each: true })
  usernames!: string[];
}
