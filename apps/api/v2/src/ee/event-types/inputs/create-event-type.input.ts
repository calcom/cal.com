import { IsNumber, IsString, Min } from "class-validator";

export class CreateEventTypeInput {
  @IsNumber()
  @Min(1)
  length!: number;

  @IsString()
  slug!: string;

  @IsString()
  title!: string;
}
