import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RefreshTokenInput {
  @IsString()
  @DocsProperty({ description: "Managed user's refresh token." })
  refreshToken!: string;
}
