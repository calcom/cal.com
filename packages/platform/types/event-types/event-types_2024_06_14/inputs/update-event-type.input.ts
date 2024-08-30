import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, ValidateNested, IsArray } from "class-validator";

import { BaseCreateEventTypeInput_2024_06_14, Host } from "./create-event-type.input";

export class UpdateEventTypeInput_2024_06_14 extends BaseCreateEventTypeInput_2024_06_14 {}

export class UpdateTeamEventTypeInput_2024_06_14 extends UpdateEventTypeInput_2024_06_14 {
  @ValidateNested({ each: true })
  @Type(() => Host)
  @IsArray()
  @IsOptional()
  @DocsProperty()
  hosts?: Host[];

  @IsOptional()
  @IsBoolean()
  @DocsProperty()
  assignAllTeamMembers?: boolean;
}
