import { IsNumberString } from "class-validator";

export class EventTypeIdParams {
  @IsNumberString()
  eventTypeId!: number;
}
