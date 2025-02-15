import { IsBoolean } from "class-validator";

export class UpdateDwdInput {
  @IsBoolean()
  enabled!: boolean;
}
