import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { ApiResponseWithoutData, EventTypeOutput_2024_06_14 } from "@calcom/platform-types";

export class DeleteUserEventTypeOutput extends ApiResponseWithoutData {
  @ValidateNested()
  @Type(() => EventTypeOutput_2024_06_14)
  data!: Pick<EventTypeOutput_2024_06_14, "id" | "lengthInMinutes" | "slug" | "title">;
}
