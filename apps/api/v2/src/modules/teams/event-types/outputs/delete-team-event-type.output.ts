import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator";

import { ApiResponseWithoutData } from "@calcom/platform-types";

class DeletedTeamEventTypeData {
  @IsInt()
  @ApiProperty({ example: 1 })
  id!: number;

  @IsString()
  @ApiProperty({ example: "Team Meeting" })
  title!: string;
}

export class DeleteTeamEventTypeOutput extends ApiResponseWithoutData {
  @ApiProperty({ type: DeletedTeamEventTypeData })
  data!: DeletedTeamEventTypeData;
}
