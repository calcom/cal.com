import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";

class FilterAssignedOptionOutputItem {
  @IsString()
  @ApiProperty({ type: String, description: "The ID of the option" })
  optionId!: string;

  @IsString()
  @ApiProperty({ type: String, description: "The value of the option" })
  optionValue!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @ApiProperty({ type: [Number], description: "Array of user IDs assigned to this option" })
  userIds!: number[];
}

export class FilterAssignedOptionsOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => FilterAssignedOptionOutputItem)
  data!: FilterAssignedOptionOutputItem[];
}
