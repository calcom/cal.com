import { IsString } from "class-validator";

export class OAuthAuthorizeInput {
  @IsString()
  redirectUri!: string;
}
