import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class ReserveSlotOutput_2024_09_04 {
  @IsString()
  @ApiProperty({
    example: "e84be5a3-4696-49e3-acc7-b2f3999c3b94",
    description: "The unique identifier of the reservation.",
  })
  @Expose()
  uid!: string;
}
