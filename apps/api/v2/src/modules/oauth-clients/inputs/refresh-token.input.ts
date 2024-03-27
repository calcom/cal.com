import { IsString } from "class-validator";

export class RefreshTokenInput {
  @IsString()
  refreshToken!: string;
}
