import { IsString } from "class-validator";

export class GcalSaveRedirectOutput {
  @IsString()
  url!: string;
}
