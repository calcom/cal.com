import { IsNumberString } from "class-validator";

export class EventTypeIdParams_2024_04_15 {
  @IsNumberString()
  eventTypeId!: number;
}
