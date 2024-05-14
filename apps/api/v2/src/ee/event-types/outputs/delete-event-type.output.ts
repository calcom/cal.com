import {
  CREATE_EVENT_LENGTH_EXAMPLE,
  CREATE_EVENT_SLUG_EXAMPLE,
  CREATE_EVENT_TITLE_EXAMPLE,
} from "@/ee/event-types/inputs/create-event-type.input";
import { ApiProperty } from "@nestjs/swagger";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class DeleteData {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  length!: number;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_SLUG_EXAMPLE })
  slug!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;
}

export class DeleteEventTypeOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Type(() => DeleteData)
  data!: DeleteData;
}
