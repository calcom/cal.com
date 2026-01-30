import type { PipeTransform } from "@nestjs/common";
import { BadRequestException, Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";
import { OAuth2ExchangeConfidentialInput, OAuth2ExchangePublicInput } from "./exchange.input";
import { OAuth2RefreshConfidentialInput, OAuth2RefreshPublicInput } from "./refresh.input";

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
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    const grantType = (value as Record<string, unknown>).grantType;

    if (grantType === "authorization_code") {
      return this.validateExchange(value);
    }

    if (grantType === "refresh_token") {
      return this.validateRefresh(value);
    }

    throw new BadRequestException("grantType must be 'authorization_code' or 'refresh_token'");
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
      throw new BadRequestException(this.formatErrors(errors));
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
    return "clientSecret" in value;
  }

  private isConfidentialRefresh(value: OAuth2TokenInput): value is OAuth2RefreshConfidentialInput {
    return "clientSecret" in value;
  }
}
