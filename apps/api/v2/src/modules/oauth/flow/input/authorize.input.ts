import { IsString } from "class-validator";

export class OAuthAuthorizeInput {
  @IsString()
  redirect_uri!: string;
}
