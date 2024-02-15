import { IsOptional, IsString } from "class-validator";

export class RemoveSelectedSlotInput {
  @IsString()
  @IsOptional()
  uid?: string;
}
