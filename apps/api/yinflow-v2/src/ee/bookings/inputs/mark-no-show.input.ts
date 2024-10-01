import { Type } from "class-transformer";
import { IsOptional, IsArray, IsEmail, IsBoolean, ValidateNested } from "class-validator";

class Attendee {
  @IsEmail()
  email!: string;

  @IsBoolean()
  absent!: boolean;
}

export class MarkNoShowInput {
  @IsBoolean()
  @IsOptional()
  host?: boolean;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  attendees!: Attendee[];
}
