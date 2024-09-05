import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AssignOrganizationAttributeOptionToUserInput {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly value?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly attributeOptionId?: string;

  @IsNotEmpty()
  @IsString()
  readonly attributeId!: string;
}
