import { Type } from "class-transformer";
import { IsString, IsOptional, IsArray, IsEmail, IsBoolean, ValidateNested } from "class-validator";

class Attendee {
  @IsEmail()
  email!: string;

  @IsBoolean()
  noShow!: boolean;
}

export class MarkNoShowInput {
  @IsString()
  bookingUid!: string;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  attendees?: Attendee[];
}
