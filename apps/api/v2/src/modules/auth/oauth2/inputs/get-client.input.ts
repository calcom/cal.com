import { IsString } from "class-validator";

export class GetOAuth2ClientInput {
  @IsString()
  clientId!: string;
}
