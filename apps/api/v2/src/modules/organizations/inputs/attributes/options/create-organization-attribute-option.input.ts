import { IsNotEmpty, IsString } from "class-validator";

export class CreateOrganizationAttributeOptionInput {
  @IsString()
  @IsNotEmpty()
  readonly value!: string;

  @IsString()
  @IsNotEmpty()
  readonly slug!: string;
}
