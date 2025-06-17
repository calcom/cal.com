import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, ValidateNested, ArrayMinSize } from "class-validator";

export enum HostAction {
  ADD = "add",
  REMOVE = "remove",
}

export class HostActionDto {
  @IsEnum(HostAction)
  @ApiProperty({ enum: HostAction, example: "add", description: "Action to perform on the host" })
  action!: HostAction;

  @IsNumber()
  @ApiProperty({ type: Number, example: 123, description: "User ID of the host to add or remove" })
  userId!: number;
}

export class UpdateBookingHostsInput_2024_08_13 {
  @IsArray()
  @ArrayMinSize(1, { message: "At least one host action is required" })
  @ValidateNested({ each: true })
  @Type(() => HostActionDto)
  @ApiProperty({
    type: [HostActionDto],
    description: "Array of host actions to perform",
    example: [
      { action: "add", userId: 10 },
      { action: "remove", userId: 5 },
    ],
  })
  hosts!: HostActionDto[];
}
