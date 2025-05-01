import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class DeleteOAuthClientInput {
  @IsString()
  @ApiProperty()
  id!: string;
}
