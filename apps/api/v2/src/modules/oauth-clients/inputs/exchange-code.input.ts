import { IsString } from "class-validator";

export class ExchangeAuthorizationCodeInput {
  @IsString()
  clientSecret!: string;
}
