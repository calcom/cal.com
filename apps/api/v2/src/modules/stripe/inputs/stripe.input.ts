import { IsString, IsOptional } from "class-validator";

export class StripeConnectQueryParamsInputDto {
  @IsString()
  @IsOptional()
  readonly redir?: string;
}
