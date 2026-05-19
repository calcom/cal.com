import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { URL } from "node:url";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsBoolean,
  IsOptional,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface, // Type-only import for clean compilation
  isURL,
  IsNotEmpty,
  IsArray,
} from "class-validator";

// Custom constraint to validate ICS URLs with DNS resolution protection
@ValidatorConstraint({ async: true }) // 👈 MUST be true for async DNS lookups
export class IsICSUrlConstraint implements ValidatorConstraintInterface {
  
  private isPrivateIp(ip: string): boolean {
    const ipv4Private =
      /^(10\.)|^(127\.)|^(192\.168\.)|^(169\.254\.)|^(172\.(1[6-9]|2[0-9]|3[0-1])\.)/;
    const ipv6Private =
      /^(::1$)|^(fe80:)|^(fc|fd)|^(::ffff:127\.)|^(::)$/i;

    return ipv4Private.test(ip) || ipv6Private.test(ip);
  }

  private async assertSafeDns(hostname: string): Promise<void> {
    const result = await lookup(hostname, { all: true });
    for (const entry of result) {
      if (this.isPrivateIp(entry.address)) {
        throw new Error("Blocked private/internal IP resolution");
      }
    }
  }

  async validate(url: unknown): Promise<boolean> { // 👈 Changed to async Promise
    if (typeof url !== "string") return false;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (hostname === "localhost") return false;
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    // Syntax check
    if (
      !isURL(url, {
        require_protocol: true,
        require_valid_protocol: true,
        protocols: ["http", "https"],
        require_tld: process.env.NODE_ENV === "production",
      })
    ) {
      return false;
    }

    // Advanced SSRF Hardening (IP & DNS checks)
    if (isIP(hostname) !== 0) {
      if (this.isPrivateIp(hostname)) return false;
    } else {
      try {
        await this.assertSafeDns(hostname);
      } catch {
        return false;
      }
    }

    return true;
  }

  defaultMessage() {
    return "Invalid or unsafe calendar URL (blocked for security reasons)";
  }
}

export class CreateIcsFeedInputDto {
  @ApiProperty({
    example: ["https://cal.com/ics/feed.ics", "http://cal.com/ics/feed.ics"],
    description: "An array of ICS URLs",
    type: "array",
    items: {
      type: "string",
      example: "https://cal.com/ics/feed.ics",
    },
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  @Validate(IsICSUrlConstraint, { each: true }) 
  urls!: string[];

  @IsBoolean()
  @ApiPropertyOptional({
    example: false,
    description: "Whether to allow writing to the calendar or not",
    type: "boolean",
    default: true,
  })
  @IsOptional()
  readOnly?: boolean = true;
}