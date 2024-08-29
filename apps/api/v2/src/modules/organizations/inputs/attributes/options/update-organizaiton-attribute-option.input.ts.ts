import { IsNotEmpty, IsString } from "class-validator";

export class UpdateOrganizationAttributeOptionInput {
  @IsString()
  @IsNotEmpty()
  readonly value!: string;

  @IsString()
  @IsNotEmpty()
  readonly slug!: string;
}