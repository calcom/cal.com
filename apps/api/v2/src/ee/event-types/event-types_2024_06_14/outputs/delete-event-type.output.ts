import { ApiProperty } from "@nestjs/swagger";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { CREATE_EVENT_LENGTH_EXAMPLE, CREATE_EVENT_TITLE_EXAMPLE } from "@calcom/platform-types";

class DeleteData_2024_06_14 {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  lengthInMinutes!: number;

  @IsString()
  slug!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;
}

export class DeleteEventTypeOutput_2024_06_14 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsIn([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Type(() => DeleteData_2024_06_14)
  data!: DeleteData_2024_06_14;
}
