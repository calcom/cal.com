import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateOrganizationAttributeOptionInput {
  @IsString()
  @IsOptional()
  readonly value?: string;

  @IsString()
  @IsOptional()
  readonly slug?: string;
}
