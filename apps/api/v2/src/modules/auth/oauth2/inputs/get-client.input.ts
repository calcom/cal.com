import { IsNotEmpty, IsString } from "class-validator";

export class GetOAuth2ClientInput {
  @IsString()
  @IsNotEmpty()
  clientId!: string;
}
