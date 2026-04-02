import { IsOptional, IsString } from "class-validator";

export class StripeConnectQueryParamsInputDto {
  @IsString()
  @IsOptional()
  readonly redir?: string;
}
