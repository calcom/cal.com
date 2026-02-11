import { IsEnum, IsInt, IsOptional, IsString, ValidateNested, IsArray, ValidateIf } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum HostAction {
  ADD = "add",
  REMOVE = "remove",
}

export class HostInput {
  @ApiProperty({
    enum: HostAction,
    description: "Action to perform on the host",
    example: HostAction.ADD,
  })
  @IsEnum(HostAction)
  action!: HostAction;

  @ApiPropertyOptional({
    type: Number,
    description: "User ID of the host to add or remove",
    example: 10,
  })
  @ValidateIf((o) => !o.name)
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    type: String,
    description: "Name/username of the host to add or remove (alternative to userId)",
    example: "john-doe",
  })
  @ValidateIf((o) => !o.userId)
  @IsString()
  @IsOptional()
  name?: string;
}

export class UpdateBookingHostsInput_2024_08_13 {
  @ApiProperty({
    type: [HostInput],
    description: "Array of host changes to apply to the booking",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HostInput)
  hosts!: HostInput[];
}
