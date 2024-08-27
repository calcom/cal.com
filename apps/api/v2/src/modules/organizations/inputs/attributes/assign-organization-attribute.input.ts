import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AssignOrganizationAttributeToUserInput {
  @IsString()
  @IsNotEmpty()
  readonly userId!: string;

  @IsString({ each: true })
  @IsOptional()
  // This is used for select type attributes that have predefined options
  readonly attributeOptionsIds?: string[];

  @IsString()
  @IsOptional()
  // This is used for text/number type attributes
  readonly attributeOptionValue?: string;
}
