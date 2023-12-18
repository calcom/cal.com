import { IsString } from "class-validator";

export class ExchangeAuthorizationCodeInput {
  @IsString()
  client_id!: string;

  @IsString()
  client_secret!: string;
}
