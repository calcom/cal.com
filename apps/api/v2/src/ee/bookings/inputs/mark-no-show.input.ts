import { Type } from "class-transformer";
import { IsOptional, IsArray, IsEmail, IsBoolean, ValidateNested } from "class-validator";

class Attendee {
  @IsEmail()
  email!: string;

  @IsBoolean()
  noShow!: boolean;
}

export class MarkNoShowInput {
  @IsBoolean()
  @IsOptional()
  noShowHost?: boolean;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  attendees?: Attendee[];
}
