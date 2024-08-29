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

  constructor() {
    if (!this.value && !this.attributeOptionId || this.value && this.attributeOptionId) {
      throw new Error('Either value or attributeOptionId must be set');
    }
  }

}