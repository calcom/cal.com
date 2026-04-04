import type { PipeTransform } from "@nestjs/common";
import { HttpStatus, Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";
import { OAuth2ExchangeConfidentialInput, OAuth2ExchangePublicInput } from "./exchange.input";
import { OAuth2RefreshConfidentialInput, OAuth2RefreshPublicInput } from "./refresh.input";
import { OAuth2HttpException } from "@/modules/auth/oauth2/filters/oauth2-http.exception";

export type OAuth2TokenInput =
  | OAuth2ExchangeConfidentialInput
  | OAuth2ExchangePublicInput
  | OAuth2RefreshConfidentialInput
  | OAuth2RefreshPublicInput;

@Injectable()
export class OAuth2TokenInputPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: OAuth2TokenInput): OAuth2TokenInput {
    if (!value) {
      this.throwOAuthError("Body is required");
    }
    if (typeof value !== "object") {
      this.throwOAuthError("Body should be an object");
    }

    const raw = value as unknown as Record<string, unknown>;

    if (!raw.client_id || typeof raw.client_id !== "string") {
      this.throwOAuthError("client_id is required");
    }

    const grantType = raw.grant_type;

    if (grantType === "authorization_code") {
      return this.validateExchange(value);
    }

    if (grantType === "refresh_token") {
      return this.validateRefresh(value);
    }

    this.throwOAuthError("grant_type must be 'authorization_code' or 'refresh_token'");
  }

  private validateExchange(
    value: OAuth2TokenInput
  ): OAuth2ExchangeConfidentialInput | OAuth2ExchangePublicInput {
    if (this.isConfidentialExchange(value)) {
      return this.validate(OAuth2ExchangeConfidentialInput, value);
    }
    return this.validate(OAuth2ExchangePublicInput, value);
  }

  private validateRefresh(
    value: OAuth2TokenInput
  ): OAuth2RefreshConfidentialInput | OAuth2RefreshPublicInput {
    if (this.isConfidentialRefresh(value)) {
      return this.validate(OAuth2RefreshConfidentialInput, value);
    }
    return this.validate(OAuth2RefreshPublicInput, value);
  }

  private validate<T extends object>(cls: new () => T, value: OAuth2TokenInput): T {
    const object = plainToClass(cls, value);

    const errors = validateSync(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      this.throwOAuthError(this.formatErrors(errors));
    }

    return object;
  }

  private formatErrors(errors: ValidationError[]): string {
    return errors
      .map((err) => {
        const constraints = err.constraints ? Object.values(err.constraints).join(", ") : "";
        const childrenErrors =
          err.children && err.children.length > 0 ? `${this.formatErrors(err.children)}` : "";
        return `${err.property} property is wrong,${constraints} ${childrenErrors}`;
      })
      .join(", ");
  }

  private isConfidentialExchange(value: OAuth2TokenInput): value is OAuth2ExchangeConfidentialInput {
    return "client_secret" in value;
  }

  private isConfidentialRefresh(value: OAuth2TokenInput): value is OAuth2RefreshConfidentialInput {
    return "client_secret" in value;
  }

  private throwOAuthError(description: string): never {
    throw new OAuth2HttpException(
      { error: "invalid_request", error_description: description },
      HttpStatus.BAD_REQUEST
    );
  }
}
