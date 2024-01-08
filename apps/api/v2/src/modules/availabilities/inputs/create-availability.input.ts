import { IsArray, IsDate, IsNumber } from "class-validator";

export class CreateAvailabilityInput {
  @IsArray()
  @IsNumber({}, { each: true })
  days!: number[];

  @IsDate()
  startTime!: Date;

  @IsDate()
  endTime!: Date;
}
