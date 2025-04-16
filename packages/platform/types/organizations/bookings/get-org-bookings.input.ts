import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsNumber, IsOptional } from "class-validator";

import { GetBookingsInput_2024_08_13 } from "@calcom/platform-types";

export class GetOrganizationsBookingsInput extends GetBookingsInput_2024_08_13 {
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((userId: string) => parseInt(userId));
    }
    if (Array.isArray(value)) {
      return value.map((userId: string | number) => +userId);
    }
    return value;
  })
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "userIds must contain at least 1 user id" })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by ids of users within your organization.",
    example: "?userIds=100,200",
  })
  userIds?: number[];
}
