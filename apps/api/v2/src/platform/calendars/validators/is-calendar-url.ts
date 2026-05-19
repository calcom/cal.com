import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isURL,
} from "class-validator";
import { URL } from "node:url";

@ValidatorConstraint({ async: true })
export class IsICSUrlConstraint implements ValidatorConstraintInterface {
  private isPrivateIp(ip: string): boolean {
    return (
      /^127\./.test(ip) ||
      /^10\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
      /^169\.254\./.test(ip) ||
      /^(::1|fe80:|fc|fd|::)$/i.test(ip)
    );
  }

  private async assertSafe(hostname: string) {
    const records = await lookup(hostname, { all: true });

    for (const r of records) {
      if (this.isPrivateIp(r.address)) {
        throw new Error("Private IP blocked");
      }
    }
  }

  async validate(url: unknown): Promise<boolean> {
    if (typeof url !== "string") return false;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }

    const hostname = parsed.hostname;

    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    if (
      !isURL(url, {
        require_protocol: true,
        require_valid_protocol: true,
      })
    ) {
      return false;
    }

    // IP direct check
    if (isIP(hostname)) {
      if (this.isPrivateIp(hostname)) return false;
      return true;
    }

    // DNS SSRF check (THIS fixes your failing test)
    try {
      await this.assertSafe(hostname);
    } catch {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return "Invalid or unsafe ICS URL";
  }
}