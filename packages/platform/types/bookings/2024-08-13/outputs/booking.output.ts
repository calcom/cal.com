import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

class Attendee {
  @IsString()
  @Expose()
  name!: string;

  @IsEmail()
  @Expose()
  email!: string;
}

export class BookingOutput_2024_08_13 {
  @IsInt()
  @Expose()
  id!: number;

  @IsDateString()
  @Expose()
  start!: string;

  @IsDateString()
  @Expose()
  end!: string;

  @IsInt()
  @Expose()
  duration!: number;

  @IsInt()
  @Expose()
  eventTypeId!: number;

  @ValidateNested()
  @Type(() => Attendee)
  @Expose()
  attendee!: Attendee;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  guests?: string[];

  @IsUrl()
  @IsOptional()
  @Expose()
  meetingUrl?: string;
}
