import { Transform } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class EventTypesAppInput {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  teamId?: number;
}
