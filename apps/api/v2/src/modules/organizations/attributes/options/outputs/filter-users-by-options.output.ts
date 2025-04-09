import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsNumber, IsString, ValidateNested } from "class-validator";

export class UserItem {
  @IsNumber()
  @ApiProperty({ type: Number, description: "The ID of the user" })
  userId!: number;

  @IsString()
  @ApiProperty({ type: String, description: "The username of the user" })
  username!: string;
}

export class FilterUsersByOptionsOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => UserItem)
  data!: UserItem[];
}
