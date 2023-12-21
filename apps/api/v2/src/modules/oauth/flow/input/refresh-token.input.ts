import { IsString } from "class-validator";

export class RefreshTokenInput {
  @IsString()
  refresh_token!: string;
}
